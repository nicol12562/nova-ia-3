// POST /api/chat  { messages, plan, user_id? }
// Proxy con streaming SSE a OpenRouter. La key vive SOLO como secreto de entorno
// (npx wrangler pages secret put OPENROUTER_API_KEY) — nunca hardcodeada acá.

const SYSTEM_PROMPT =
  "Sos Nova, una asistente de IA amable y directa. Respondés siempre en español rioplatense: usá el voseo en las " +
  "conjugaciones (tenés, podés, hacé, querés) pero sin insertar la palabra 'vos' de más a mitad de la oración. " +
  "Dás respuestas claras y sin relleno, con formato markdown prolijo: para listas usá '- ' o '1. ' al inicio de cada línea, " +
  "el código entre backticks y las palabras clave en **negrita**. Si no sabés algo, lo decís.";

// Instrucciones por mini agente. Se agregan al prompt base de Nova; el id viene
// del cliente pero el texto vive acá, así no se puede inyectar un sistema cualquiera.
const AGENT_PROMPTS = {
  escritor:
    "Actuás como redactor. Entregás el texto listo para usar, sin explicaciones previas. " +
    "Si falta contexto, proponés dos o tres versiones cortas con tonos distintos (formal, cercano, directo) y ya.",
  programador:
    "Actuás como par de programación. Primero pensás la solución, después das código completo y ejecutable con el " +
    "lenguaje que pide el usuario, y al final tres o cuatro líneas explicando las decisiones. " +
    "Si el enunciado es ambiguo, elegís la interpretación más simple y la aclarás en una frase.",
  ideas:
    "Actuás como generador de ideas. Respondés con una lista de 8 a 12 opciones numeradas, bien distintas entre sí, " +
    "sin relleno ni valoraciones. Cerrás con una línea sobre cuál te parece la más fuerte y por qué.",
  resumidor:
    "Actuás como resumidor. Devolvés entre 3 y 6 bullets con lo esencial, en orden de importancia, y una última " +
    "línea con lo que se perdió al resumir. No agregás información que no estaba en el texto.",
  explicador:
    "Actuás explicando temas difíciles a alguien inteligente pero sin formación en el área. Empezás por la idea " +
    "central en dos frases, después un ejemplo concreto de la vida real, y al final un detalle técnico opcional. " +
    "Evitás la jerga y, si la usás, la definís entre paréntesis.",
  traductor:
    "Actuás como traductor entre español rioplatense e inglés. Devolvés primero la traducción natural, sin " +
    "calcos, y después una nota breve si hay un modismo que cambió de sentido. No traduzcas literal si suena raro.",
};

// Escalera de modelos según el plan. Si el primero falla, se prueba el siguiente.
const MODELS = {
  gratis: ["openrouter/free", "meta-llama/llama-3.3-70b-instruct:free"],
  pro: ["deepseek/deepseek-v4-flash", "meta-llama/llama-3.3-70b-instruct:free"],
  plus: ["google/gemini-3.8-flash", "deepseek/deepseek-v4-flash"],
};

// Techo de salida por plan: controla costo en modelos pago y evita errores de crédito (402).
const MAX_TOKENS = { gratis: 2048, pro: 4096, plus: 8192 };

// Mensajes gratis por día para un visitante sin sesión, contados por IP.
const GUEST_LIMIT = 3;

// Retenemos los primeros caracteres antes de enviarlos al cliente. Si la
// respuesta termina siendo basura (artefactos de algunos modelos gratis,
// salidas vacías o de seguridad), el cliente todavía no vio nada y podemos
// reintentar con el siguiente modelo de la escalera sin que se note.
const BUFFER_THRESHOLD = 80;

function isDegenerateOutput(text) {
  const t = (text || "").trim();
  if (!t) return true;
  if (t.length < BUFFER_THRESHOLD) {
    if (/^(user\s*)?safety\b/i.test(t)) return true;
    if (/^(safe|unsafe)\s*[.:]?\s*$/i.test(t)) return true;
  }
  return false;
}

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;
  const body = await request.json().catch(() => null);

  const messages = Array.isArray(body?.messages) ? body.messages.slice(-20) : [];
  if (messages.length === 0) return json({ error: "Falta el historial de mensajes" }, 400);

  const userId = Number(body.user_id) || null;

  // El plan se lee de la base para que un cambio hecho en el panel surta en el
  // mensaje siguiente, sin depender de lo que el cliente tenga guardado.
  let plan = MODELS[body.plan] ? body.plan : "gratis";
  if (userId && env.DB) {
    const row = await env.DB.prepare("SELECT plan FROM users WHERE id = ?").bind(userId).first();
    if (row && MODELS[row.plan]) plan = row.plan;
  }

  // Visitante sin sesión: tope diario por IP antes de gastar una llamada arriba.
  if (!userId && env.DB) {
    const ip = request.headers.get("cf-connecting-ip") || "sin-ip";
    const day = new Date().toISOString().slice(0, 10);
    const usado = await env.DB
      .prepare("SELECT n FROM guest_usage WHERE ip = ? AND day = ?")
      .bind(ip, day)
      .first();
    if ((usado?.n || 0) >= GUEST_LIMIT) {
      return json(
        { error: "Ya usaste los 3 mensajes gratis de hoy. Inicia sesión para seguir conversando.", limite: true },
        402
      );
    }
    waitUntil(
      env.DB.prepare(
        `INSERT INTO guest_usage (ip, day, n) VALUES (?, ?, 1)
         ON CONFLICT(ip, day) DO UPDATE SET n = n + 1`
      )
        .bind(ip, day)
        .run()
        .catch(() => {})
    );
  }

  // El admin puede forzar un modelo único para todos; sin eso, la escalera del plan.
  let chain = MODELS[plan];
  if (env.DB) {
    const fijo = await env.DB.prepare("SELECT value FROM settings WHERE key = 'model'").first();
    if (fijo?.value) chain = [fijo.value];
  }

  const agent = String(body?.agent || "");
  const systemPrompt = SYSTEM_PROMPT + (AGENT_PROMPTS[agent] ? "\n\n" + AGENT_PROMPTS[agent] : "");

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // Sin secreto configurado: respuesta placeholder para que la app no se rompa.
    return ssePlaceholder(
      "Nova está en modo pruebas: falta configurar el secreto OPENROUTER_API_KEY en Cloudflare. " +
        "Cuando esté listo, acá vas a ver las respuestas en vivo."
    );
  }

  // ---- Stream compuesto con reintento silencioso entre modelos ----
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let outChars = 0;
  let finished;
  const finishedPromise = new Promise((r) => (finished = r));

  const composite = new ReadableStream({
    async start(controller) {
      let usedModel = null;
      try {
        for (const model of chain) {
          let upstream;
          try {
            upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "X-Title": "Nova IA",
              },
              body: JSON.stringify({
                model,
                messages: [{ role: "system", content: systemPrompt }, ...messages],
                stream: true,
                max_tokens: MAX_TOKENS[plan],
              }),
            });
          } catch {
            continue; // sin conexión con este modelo: probamos el siguiente
          }
          if (!upstream.ok || !upstream.body) continue;

          const reader = upstream.body.getReader();
          let emitted = false; // ¿ya le mandamos algo al cliente con este modelo?
          let buffered = ""; // texto del modelo retenido a la espera del umbral
          let heldRaw = ""; // líneas SSE crudas retenidas mientras no emitimos
          let tail = ""; // línea incompleta del último chunk

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = (tail + decoder.decode(value, { stream: true })).split("\n");
            tail = lines.pop() ?? "";
            const processedRaw = lines.join("\n") + "\n";

            for (const line of lines) {
              const t = line.trim();
              if (!t.startsWith("data:")) continue;
              const payload = t.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const delta = JSON.parse(payload).choices?.[0]?.delta?.content ?? "";
                if (!delta) continue;
                if (emitted) outChars += delta.length;
                else buffered += delta;
              } catch {
                /* línea parcial o no-JSON: se ignora */
              }
            }

            if (emitted) {
              controller.enqueue(encoder.encode(processedRaw));
            } else {
              heldRaw += processedRaw;
              if (buffered.length >= BUFFER_THRESHOLD) {
                emitted = true;
                outChars += buffered.length;
                controller.enqueue(encoder.encode(heldRaw));
                heldRaw = "";
              }
            }
          }

          // El stream terminó. Si todavía no emitimos nada, decidimos:
          if (!emitted) {
            if (isDegenerateOutput(buffered)) {
              // Basura sin haber avisado nada al cliente: siguiente modelo.
              try {
                await reader.cancel();
              } catch {
                /* noop */
              }
              continue;
            }
            // Respuesta corta pero válida (p. ej. "¡Hola!"): la liberamos.
            emitted = true;
            outChars += buffered.length;
            controller.enqueue(encoder.encode(heldRaw + tail));
            tail = "";
          } else if (tail) {
            controller.enqueue(encoder.encode(tail));
            tail = "";
          }

          usedModel = model;
          controller.close();
          break;
        }

        if (!usedModel) {
          // Ningún modelo respondió: mensaje claro en lugar de silencio.
          const msg =
            "Ahora mismo no pude obtener una respuesta. Probá de nuevo en un rato: casi siempre se resuelve al reintentar.";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta: { content: msg } }] })}\n\ndata: [DONE]\n\n`
            )
          );
        }
      } catch {
        /* el cliente cerró la conexión o el upstream se cortó: cerramos prolijo */
      } finally {
        try {
          controller.close();
        } catch {
          /* ya cerrado */
        }
        finished({ outChars });
      }
    },
  });

  // Registro de uso (solo contenido real enviado al cliente) para usuarios con sesión
  if (userId && env.DB) {
    const inputTokens = Math.round(messages.reduce((a, m) => a + (m.content || "").length, 0) / 4);
    const day = new Date().toISOString().slice(0, 10);
    waitUntil(
      finishedPromise
        .then(() =>
          env.DB.prepare(
            `INSERT INTO usage_daily (user_id, day, tokens_in, tokens_out)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id, day) DO UPDATE SET
               tokens_in = tokens_in + excluded.tokens_in,
               tokens_out = tokens_out + excluded.tokens_out`
          )
            .bind(userId, day, inputTokens, Math.round(outChars / 4))
            .run()
            .catch(() => {})
        )
    );
  } else {
    waitUntil(finishedPromise.catch(() => {}));
  }

  return new Response(composite, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

function ssePlaceholder(text) {
  const payload =
    `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n` + `data: [DONE]\n\n`;
  return new Response(payload, {
    status: 200,
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" },
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
