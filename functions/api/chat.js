// POST /api/chat  { messages, model?, agent?, prefs? }
// Proxy con streaming SSE a OpenRouter. La key vive SOLO como secreto de entorno.
// La cuenta, el plan y los saldos por modelo salen de D1 vía la cookie de
// sesión: el cliente no puede inflarse el techo ni gastarle tokens a otro.

import {
  SLOTS,
  MAX_TOKENS,
  slotByKey,
  techoDe,
  upstreamDe,
  ordenAlternativas,
} from "../_lib/models.js";
import { leerSesion } from "../_lib/session.js";
import { notasDe, promptMemoria } from "../_lib/memoria.js";

// Base común a todas las respuestas. El idioma y el largo vienen de las
// preferencias del usuario (más abajo), no de acá.
const SYSTEM_PROMPT =
  "Sos Nova, una asistente de IA amable y directa. " +
  "Dás respuestas claras y sin relleno, con formato markdown prolijo: para listas usá '- ' o '1. ' al inicio de cada línea, " +
  "el código entre backticks y las palabras clave en **negrita**. Si no sabés algo, lo decís.";

// Instrucciones por mini agente. Se agregan al prompt base de Nova; el id viene
// del cliente pero el texto vive acá, así no se puede inyectar un sistema cualquiera.
const AGENT_PROMPTS = {
  ventawhats:
    "Actuás como el asistente de un negocio chico de Argentina que atiende por WhatsApp, en nombre del " +
    "dueño. Devolvés SÓLO el mensaje listo para copiar y pegar en el chat del cliente: entre 1 y 4 líneas, " +
    "voseo, sin 'Estimado', sin firma, sin markdown ni viñetas, sin emojis salvo que el cliente los use. " +
    "Si la respuesta depende de un dato que no tenés (stock, talles, seña, dirección, un precio concreto), " +
    "preguntalo en una línea en vez de inventarlo. Nunca inventás precios, disponibilidad ni tiempos de " +
    "entrega: es lo único que le hace perder un cliente de verdad a un negocio.",
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

// Instrucciones de velocidad. Van siempre: el usuario pidió respuestas ágiles,
// y acortar la salida es lo que más baja la latencia real de un modelo.
const SPEED_PROMPT =
  "Regla de oro: respondé rápido y al grano. No repitas la pregunta, no abras con " +
  "\"claro\", \"buena pregunta\" ni ofertas de ayuda, no cierres resumiendo lo que ya dijiste. " +
  "Primera línea = la respuesta. Si alcanza con una frase, dá una frase.";

const IDIOMAS = {
  ar: "Respondé en español rioplatense con voseo (tenés, podés, hacé).",
  es: "Responde en español neutro, usando \"tú\" y sin modismos regionales.",
  en: "Reply in plain US English.",
};

const LARGOS = {
  breve: {
    extra: "Máximo 4 líneas o 3 bullets. Sin encabezados. Código solo si lo piden.",
    maxTokens: 700,
  },
  equilibrado: {
    extra: "Una respuesta mediana: 1-2 párrafos o hasta 6 bullets, con markdown.",
    maxTokens: 2048,
  },
  detallado: {
    extra: "Podés extenderte con secciones, ejemplos y código comentado.",
    maxTokens: 4096,
  },
};

// Mensajes gratis por día para un visitante sin sesión, contados por IP.
const GUEST_LIMIT = 3;

// Retenemos los primeros caracteres antes de enviarlos al cliente. Si la
// respuesta termina siendo basura (artefactos de algunos modelos gratis,
// salidas vacías o de seguridad), el cliente todavía no vio nada y podemos
// reintentar con el siguiente candidato sin que se note.
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

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return ssePlaceholder(
      "Nova está en modo pruebas: falta configurar el secreto OPENROUTER_API_KEY en Cloudflare. " +
        "Cuando esté listo, acá vas a ver las respuestas en vivo."
    );
  }

  // La identidad sale de la cookie, no del body: con user_id cualquiera podía
  // gastar el saldo de otra cuenta.
  const user = await leerSesion(request, env);
  const userId = user?.id || null;

  // ---- plan: manda la base, nunca el cliente ----
  const plan = user && MAX_TOKENS[user.plan] ? user.plan : "gratis";

  // ---- visitantes: tope diario por IP ----
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
      env.DB
        .prepare(
          `INSERT INTO guest_usage (ip, day, n) VALUES (?, ?, 1)
           ON CONFLICT(ip, day) DO UPDATE SET n = n + 1`
        )
        .bind(ip, day)
        .run()
        // Sin esto, las IPs de un día que ya no sirve quedan acumuladas para
        // siempre en la base. La política dice que se purgan: acá se cumple.
        .then(() =>
          env.DB
            .prepare("DELETE FROM guest_usage WHERE day < date('now', '-2 day')")
            .run()
        )
        .catch(() => {})
    );
  }

  // ---- los mini agentes son de plan pago ----
  const agent = String(body?.agent || "");
  if (agent && !AGENT_PROMPTS[agent]) return json({ error: "Ese agente no existe." }, 400);
  if (agent && plan === "gratis") {
    return json(
      { error: "Los mini agentes son de Pro o Plus. Elegí un plan para desbloquearlos.", agentes: true },
      403
    );
  }
  // Preferencias del dispositivo: se validan contra las listas del servidor.
  const idioma = IDIOMAS[body?.prefs?.idioma] ? body.prefs.idioma : "ar";
  const largo = LARGOS[body?.prefs?.largo] ? body.prefs.largo : "breve";

  // Memoria de largo plazo: lo que esta persona pidió que Nova recuerde.
  const notas = await notasDe(env, userId);

  const systemPrompt = [
    SYSTEM_PROMPT,
    IDIOMAS[idioma],
    SPEED_PROMPT,
    LARGOS[largo].extra,
    agent ? AGENT_PROMPTS[agent] : null,
    promptMemoria(notas),
  ]
    .filter(Boolean)
    .join("\n\n");

  // ---- saldo por modelo en el mes corriente ----
  const month = new Date().toISOString().slice(0, 7) + "-01";
  const pedidos = slotByKey(body.model) ? body.model : "flash";
  let usados = {};
  if (userId && env.DB) {
    const r = await env.DB
      .prepare("SELECT model, tokens FROM model_usage WHERE user_id = ? AND month = ?")
      .bind(userId, month)
      .all();
    usados = Object.fromEntries((r.results || []).map((x) => [x.model, x.tokens]));
  }

  // El admin puede forzar un upstream único; se sigue cobrando contra el slot elegido.
  let forzado = null;
  if (env.DB) {
    const fijo = await env.DB.prepare("SELECT value FROM settings WHERE key = 'model'").first();
    if (fijo?.value) forzado = fijo.value;
  }

  const restantes = (key) => Math.max(0, techoDe(plan, key) - (usados[key] || 0));
  const orden = ordenAlternativas(plan, pedidos).filter((k) => slotByKey(k));
  const candidatos = orden.filter((k) => !userId || restantes(k) > 0);

  if (candidatos.length === 0) {
    const agotado = orden.map((k) => `${slotByKey(k).label}: ${fmt(restantes(k))} restantes`).join(" · ");
    return ssePlaceholder(
      `Te quedaste sin saldo de modelos este mes en el plan ${plan}. ${agotado}. ` +
        "Cambiá de plan o esperá a la renovación."
    );
  }

  // El largo elegido manda, pero el plan pone el techo.
  const maxTokens = Math.min(LARGOS[largo].maxTokens, MAX_TOKENS[plan]);

  // ---- stream compuesto con reintento entre candidatos ----
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let outChars = 0;
  let usedSlot = null;
  let usedTokens = 0;
  let usedPrompt = 0;
  let usedCompletion = 0;
  const codigos = []; // por qué falló cada candidato: sin esto el 429 se disfraza de "intentá de nuevo"
  const motivos = []; // primer fragmento del error de OpenRouter, sin la key
  let marcarListo = () => {};
  const finished = new Promise((resolve) => { marcarListo = resolve; });

  const composite = new ReadableStream({
    async start(controller) {
      try {
        for (const key of candidatos) {
          const slot = slotByKey(key);
          const upstream = forzado || upstreamDe(plan, key, null);
          if (!upstream) continue;

          let res;
          try {
            res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "X-Title": "Nova IA",
              },
              body: JSON.stringify({
                model: upstream,
                messages: [{ role: "system", content: systemPrompt }, ...messages],
                stream: true,
                max_tokens: maxTokens,
                // Los modelos de razonamiento del router gratuito escribían su
                // "Analyze the Request..." dentro de content: el usuario veía el
                // system prompt como respuesta. Siguen razonando, no nos lo mandan.
                reasoning: { exclude: true },
              }),
            });
          } catch {
            codigos.push("red");
            continue;
          }
          if (!res.ok || !res.body) {
            codigos.push(res.status || 0);
            // El cuerpo del error dice por qué (key inválida, sin crédito, modelo
            // muerto). Se guarda sanitizado y corto: sin esto un 401 se ve igual
            // que un 429 y uno termina culpando al cupo equivocado.
            try {
              const texto = (await res.text()).slice(0, 300);
              const limpio = texto.replace(/sk-or-[A-Za-z0-9_-]+/g, "sk-***").replace(/\s+/g, " ").trim();
              if (limpio && !motivos.includes(limpio)) motivos.push(limpio.slice(0, 140));
            } catch {
              /* sin cuerpo */
            }
            continue;
          }

          const reader = res.body.getReader();
          let emitted = false;
          let buffered = "";
          let heldRaw = "";
          let tail = "";
          let promptTokens = 0;
          let completionTokens = 0;

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
                const j = JSON.parse(payload);
                if (j.usage) {
                  promptTokens = j.usage.prompt_tokens || promptTokens;
                  completionTokens = j.usage.completion_tokens || completionTokens;
                }
                const delta = j.choices?.[0]?.delta?.content ?? "";
                if (delta) {
                  if (emitted) outChars += delta.length;
                  else buffered += delta;
                }
              } catch {
                /* línea parcial o no-JSON */
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

          if (!emitted) {
            if (isDegenerateOutput(buffered)) {
              try { await reader.cancel(); } catch { /* noop */ }
              continue;
            }
            emitted = true;
            outChars += buffered.length;
            controller.enqueue(encoder.encode(heldRaw + tail));
            tail = "";
          } else if (tail) {
            controller.enqueue(encoder.encode(tail));
            tail = "";
          }

          usedSlot = key;
          usedPrompt = promptTokens;
          usedCompletion = completionTokens;
          usedTokens = promptTokens + completionTokens || Math.round((messagesCharLen(messages) + outChars) / 4);
          controller.enqueue(
            encoder.encode(`event: nova\ndata: ${JSON.stringify({ model: slot.label, key, tokens: usedTokens })}\n\n`)
          );
          controller.close();
          break;
        }

        if (!usedSlot) {
          // Un 429 de OpenRouter en modelos gratis no es una falla transitoria:
          // significa que se acabaron los requests gratuitos del día (50/día con
          // menos de US$10 de crédito en la cuenta). Decir "probá de nuevo" era mentir.
          // Dos 429 distintos, y decirle lo equivocado al usuario es peor que el
          // error: "temporarily rate-limited upstream" es el proveedor gratis
          // saturado (transitorio); rate_limit_exceeded es el tope de 50 requests
          // por día de la cuenta, y ese no se resuelve reintentando.
          const motivo = motivos.join(" ");
          const saturado = /temporarily rate-limited|Provider returned error/i.test(motivo);
          const cupo = codigos.includes(429) && !saturado;
          const msg = cupo
            ? "Se acabaron las respuestas gratuitas de hoy. Volvení a probar mañana, o pasá a un plan pago para usar modelos que no dependen del cupo gratuito."
            : "El modelo gratuito está saturado ahora mismo. Probá de nuevo en un minuto: suele descomprimirse solo.";
          // El aviso va ANTES del texto: si llega sólo como delta, el frente no
          // tiene cómo saber que no fue una respuesta del modelo y lo sube al canvas.
          controller.enqueue(
            encoder.encode(
              `event: nova\ndata: ${JSON.stringify({ model: null, key: null, error: true, cupo, codigos, motivos })}\n\n`
            )
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: msg } }] })}\n\ndata: [DONE]\n\n`)
          );
        }
      } catch {
        /* el cliente cerró la conexión o el upstream se cortó */
      } finally {
        try { controller.close(); } catch { /* ya cerrado */ }
        marcarListo({ outChars });
      }
    },
  });

  // ---- registro de consumo: por modelo y acumulado diario ----
  if (userId && env.DB) {
    const day = new Date().toISOString().slice(0, 10);
    waitUntil(
      finished
        .then(async () => {
          // Se anotan los tokens REALES que reportó el proveedor. Antes el
          // acumulado diario usaba caracteres/4, así que "Uso y tokens" mostraba
          // 161 tokens totales mientras el saldo por modelo ya había descontado
          // 1.022 del mismo mes: dos números distintos en la misma pantalla.
          const estimado = Math.round((messagesCharLen(messages) + outChars) / 4);
          const tokensIn = usedPrompt || Math.round(messagesCharLen(messages) / 4);
          const tokensOut = usedCompletion || Math.round(outChars / 4);
          const total = usedTokens || estimado;
          if (!total) return;
          if (usedSlot) {
            await env.DB
              .prepare(
                `INSERT INTO model_usage (user_id, model, month, tokens) VALUES (?, ?, ?, ?)
                 ON CONFLICT(user_id, model, month) DO UPDATE SET tokens = tokens + excluded.tokens`
              )
              .bind(userId, usedSlot, month, total)
              .run();
          }
          return env.DB
            .prepare(
              `INSERT INTO usage_daily (user_id, day, tokens_in, tokens_out)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(user_id, day) DO UPDATE SET
                 tokens_in = tokens_in + excluded.tokens_in,
                 tokens_out = tokens_out + excluded.tokens_out`
            )
            .bind(userId, day, tokensIn, tokensOut)
            .run();
        })
        .catch(() => {})
    );
  } else {
    waitUntil(finished.then(() => {}).catch(() => {}));
  }

  return new Response(composite, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Nova-Model": usedSlot || "pending",
    },
  });
}

const messagesCharLen = (msgs) => msgs.reduce((a, m) => a + (m.content || "").length, 0);
const fmt = (n) => Math.round(n).toLocaleString("es-AR");

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
