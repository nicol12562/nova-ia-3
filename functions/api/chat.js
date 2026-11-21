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
import {
  RESERVA,
  SLA_PRIMER_TOKEN_MS,
  SLA_SILENCIO_MS,
  candidatosDe,
  cooldownSegun,
  estaFrio,
  esErrorDeCredencial,
  esRecuperable,
} from "../_lib/resiliencia.js";

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

// Límites del pedido. El historial lo arma el navegador, así que se valida acá:
// sin esto, un body de varios MB o un mensaje con role "system" llegaba tal cual
// al proveedor (y el usuario podía reescribirle las reglas a Nova).
const MAX_BODY_BYTES = 256 * 1024;
const MAX_MENSAJES = 20;
const MAX_CHARS_MENSAJE = 32000;
const MAX_CHARS_TOTAL = 64000;

// Deja sólo { role: user|assistant, content: string no vacío }. Recorta el
// historial viejo para entrar en el tope total; el último mensaje no se recorta:
// si es demasiado largo se rechaza con un mensaje claro.
function limpiarHistorial(crudo) {
  if (!Array.isArray(crudo)) return { error: "Falta el historial de mensajes." };
  const limpios = [];
  for (const m of crudo.slice(-MAX_MENSAJES * 3)) {
    if (!m || typeof m !== "object") continue;
    if (m.role !== "user" && m.role !== "assistant") continue;
    if (typeof m.content !== "string" || !m.content.trim()) continue;
    limpios.push({ role: m.role, content: m.content });
  }
  const mensajes = limpios.slice(-MAX_MENSAJES);
  if (!mensajes.some((m) => m.role === "user")) return { error: "Falta el historial de mensajes." };
  const ultimo = mensajes[mensajes.length - 1];
  if (ultimo.content.length > MAX_CHARS_MENSAJE) {
    return {
      error: `Tu mensaje es demasiado largo (máximo ${fmt(MAX_CHARS_MENSAJE)} caracteres). Probá dividirlo en partes.`,
      status: 413,
    };
  }
  for (let i = 0; i < mensajes.length - 1; i++) {
    if (mensajes[i].content.length > MAX_CHARS_MENSAJE) {
      mensajes[i] = { ...mensajes[i], content: mensajes[i].content.slice(0, MAX_CHARS_MENSAJE) };
    }
  }
  let total = messagesCharLen(mensajes);
  while (mensajes.length > 1 && total > MAX_CHARS_TOTAL) total -= mensajes.shift().content.length;
  return { mensajes };
}

async function leerBody(request) {
  const declarado = Number(request.headers.get("content-length") || 0);
  if (declarado > MAX_BODY_BYTES) return { error: "El pedido es demasiado grande.", status: 413 };
  let texto;
  try {
    texto = await request.text();
  } catch {
    return { error: "No pude leer el pedido.", status: 400 };
  }
  if (texto.length > MAX_BODY_BYTES) return { error: "El pedido es demasiado grande.", status: 413 };
  try {
    const body = JSON.parse(texto);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("no es objeto");
    return { body };
  } catch {
    return { error: "El pedido no es JSON válido.", status: 400 };
  }
}

// Si D1 o la sesión fallan antes de abrir el stream, el usuario recibe un error
// en español (el frente muestra data.error) y no la página 500 de Cloudflare.
export async function onRequestPost(context) {
  try {
    return await atender(context);
  } catch {
    return json({ error: "Nova tuvo un problema interno. Reintentá en unos segundos." }, 500);
  }
}

async function atender(context) {
  const { request, env, waitUntil } = context;
  const leido = await leerBody(request);
  if (leido.error) return json({ error: leido.error }, leido.status);
  const body = leido.body;

  const historial = limpiarHistorial(body.messages);
  if (historial.error) return json({ error: historial.error }, historial.status || 400);
  const messages = historial.mensajes;

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
  // El mensaje se descuenta recién cuando el pedido pasó todas las validaciones:
  // antes, un agente inválido o bloqueado le comía uno de los 3 del día.
  let cobrarInvitado = null;
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
    cobrarInvitado = { ip, day };
  }

  // ---- los mini agentes son de plan pago ----
  const agent = String(body?.agent || "");
  if (agent && !Object.hasOwn(AGENT_PROMPTS, agent)) return json({ error: "Ese agente no existe." }, 400);
  if (agent && plan === "gratis") {
    return json(
      { error: "Los mini agentes son de Pro o Plus. Elegí un plan para desbloquearlos.", agentes: true },
      403
    );
  }
  // Preferencias del dispositivo: se validan contra las listas del servidor.
  // hasOwn: con "constructor" o "toString" el lookup devolvía una función heredada
  // y se colaba en el system prompt (y max_tokens quedaba en NaN).
  const idioma = Object.hasOwn(IDIOMAS, body.prefs?.idioma ?? "") ? body.prefs.idioma : "ar";
  const largo = Object.hasOwn(LARGOS, body.prefs?.largo ?? "") ? body.prefs.largo : "breve";

  if (cobrarInvitado) {
    const { ip, day } = cobrarInvitado;
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
  const conSaldo = orden.filter((k) => !userId || restantes(k) > 0);

  if (conSaldo.length === 0) {
    const agotado = orden.map((k) => `${slotByKey(k).label}: ${fmt(restantes(k))} restantes`).join(" · ");
    return ssePlaceholder(
      `Te quedaste sin saldo de modelos este mes en el plan ${plan}. ${agotado}. ` +
        "Cambiá de plan o esperá a la renovación."
    );
  }

  // Lista de intentos: lo forzado por el admin, la escalera del plan y al fondo
  // la reserva paga. Cada upstream se prueba una sola vez y se saltea si está en
  // enfriamiento por fallos recientes.
  let frios = [];
  if (env.DB) {
    try {
      const h = await env.DB.prepare("SELECT upstream, until FROM upstream_health").all();
      frios = (h.results || []).filter((r) => estaFrio(r)).map((r) => r.upstream);
    } catch {
      /* si la tabla falla, se intenta con todo */
    }
  }

  const intentos = [];
  const vistos = new Set();
  const agregar = (upstream, key) => {
    if (!upstream || vistos.has(upstream) || frios.includes(upstream)) return;
    vistos.add(upstream);
    intentos.push({ upstream, key });
  };
  if (forzado) agregar(forzado, pedidos);
  conSaldo.forEach((k) => agregar(upstreamDe(plan, k, null), k));
  RESERVA.forEach((up) => agregar(up, pedidos));

  // El largo elegido manda, pero el plan pone el techo.
  const maxTokens = Math.min(LARGOS[largo].maxTokens, MAX_TOKENS[plan]);

  // ---- stream compuesto con reintento entre candidatos ----
  // Al navegador se le reenvían SÓLO los deltas de texto, re-armados por nosotros:
  // antes se pasaban las líneas crudas de OpenRouter (con el id de generación, el
  // proveedor real y, si fallaba a mitad de camino, el JSON de error interno).
  const encoder = new TextEncoder();
  let outChars = 0;
  let usedSlot = null;
  let falloCredencial = false;
  let usedTokens = 0;
  let usedPrompt = 0;
  let usedCompletion = 0;
  let ultimoMotivo = ""; // por qué falló el último intento; se guarda en upstream_health, no en el navegador
  let marcarListo = () => {};
  const finished = new Promise((resolve) => { marcarListo = resolve; });

  // El cliente puede cortar (botón "detener", timeout de 45s, cerrar la pestaña).
  // Se corta también el intento en curso contra el proveedor: seguir leyendo un
  // stream que nadie mira es gastar cupo de OpenRouter de gusto.
  let cancelado = false;
  let controlActual = null;
  const cancelar = () => {
    cancelado = true;
    try { controlActual?.abort(); } catch { /* noop */ }
  };
  if (request.signal && !request.signal.aborted) {
    request.signal.addEventListener("abort", cancelar, { once: true });
  } else if (request.signal?.aborted) {
    cancelado = true;
  }

  const composite = new ReadableStream({
    async start(controller) {
      const enviar = (texto) => {
        if (cancelado) return false;
        try {
          controller.enqueue(encoder.encode(texto));
          return true;
        } catch {
          cancelar();
          return false;
        }
      };
      const delta = (content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

      try {
        for (const intento of intentos) {
          if (cancelado) break;
          const key = intento.key;
          const slot = slotByKey(key);
          const upstream = intento.upstream;
          if (!slot) continue;

          // Un upstream que cuelga es peor que uno que falla: el usuario se queda
          // mirando "Nova está pensando" sin fin. Se corta el intento si no
          // aparece el primer token, y también si el stream se queda mudo.
          const control = new AbortController();
          controlActual = control;
          let cronometro = setTimeout(() => control.abort(), SLA_PRIMER_TOKEN_MS);
          const rearmar = () => {
            clearTimeout(cronometro);
            cronometro = setTimeout(() => control.abort(), SLA_SILENCIO_MS);
          };

          let res;
          try {
            res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              signal: control.signal,
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
          } catch (e) {
            clearTimeout(cronometro);
            if (cancelado) break; // lo cortó el cliente: el proveedor no tiene la culpa
            const motivoAbort = e?.name === "AbortError";
            ultimoMotivo = motivoAbort ? `sin respuesta en ${SLA_PRIMER_TOKEN_MS / 1000}s` : "fallo de red";
            marcarFrio(env, waitUntil, upstream, motivoAbort ? 408 : 0, ultimoMotivo);
            continue;
          }
          if (!res.ok || !res.body) {
            clearTimeout(cronometro);
            // El cuerpo dice por qué (key inválida, sin crédito, modelo muerto).
            // Se sanitiza (fuera la key) y se guarda corto en la tabla del breaker.
            ultimoMotivo = "HTTP " + (res.status || 0);
            try {
              const texto = (await res.text()).slice(0, 300);
              const limpio = texto.replace(/sk-or-[A-Za-z0-9_-]+/g, "sk-***").replace(/\s+/g, " ").trim();
              if (limpio) ultimoMotivo = `${ultimoMotivo} ${limpio.slice(0, 120)}`;
            } catch {
              /* sin cuerpo */
            }
            if (esErrorDeCredencial(res.status)) {
              // Con la key rechazada, probar otros modelos gasta el cupo del día
              // para llegar al mismo 401.
              falloCredencial = true;
              break;
            }
            if (esRecuperable(res.status)) marcarFrio(env, waitUntil, upstream, res.status, ultimoMotivo);
            continue;
          }

          // Decoder propio por intento: si el anterior se cortó a mitad de un
          // carácter multibyte, sus bytes sueltos no ensucian al siguiente.
          const decoder = new TextDecoder();
          const reader = res.body.getReader();
          let emitted = false;
          let buffered = "";
          let tail = "";
          let promptTokens = 0;
          let completionTokens = 0;
          let cortado = false; // timeout, red o cancelación a mitad del stream
          let errorUpstream = ""; // el proveedor mandó {"error":...} dentro del stream

          const procesar = (line) => {
            const t = line.trim();
            if (!t.startsWith("data:")) return; // comentarios ": OPENROUTER PROCESSING", etc.
            // Sólo cuentan como señal de vida las líneas de datos: los keep-alive
            // de OpenRouter llegan cada pocos segundos aunque el modelo esté
            // colgado en cola, y con ellos el SLA del primer token no saltaba nunca.
            rearmar();
            const payload = t.slice(5).trim();
            if (payload === "[DONE]") return;
            let j;
            try {
              j = JSON.parse(payload);
            } catch {
              return; /* no-JSON */
            }
            if (j?.error) {
              const e = j.error;
              errorUpstream = `stream: ${e.code ?? ""} ${String(e.message || "").slice(0, 100)}`.trim();
              return;
            }
            if (j?.usage) {
              promptTokens = j.usage.prompt_tokens || promptTokens;
              completionTokens = j.usage.completion_tokens || completionTokens;
            }
            const d = j?.choices?.[0]?.delta?.content;
            if (typeof d !== "string" || !d) return;
            if (emitted) {
              outChars += d.length;
              enviar(delta(d));
            } else {
              buffered += d;
              if (buffered.length >= BUFFER_THRESHOLD) {
                emitted = true;
                // Desde acá el usuario ya vio texto: el turno se cobra a este
                // slot aunque después se corte o el cliente aborte.
                usedSlot = key;
                outChars += buffered.length;
                enviar(delta(buffered));
                buffered = "";
              }
            }
          };

          try {
            while (!errorUpstream && !cancelado) {
              const { done, value } = await reader.read();
              if (done) break;
              const lines = (tail + decoder.decode(value, { stream: true })).split("\n");
              tail = lines.pop() ?? "";
              for (const line of lines) {
                procesar(line);
                if (errorUpstream) break;
              }
            }
            if (!errorUpstream && !cancelado) {
              tail += decoder.decode();
              if (tail) procesar(tail);
            }
          } catch {
            cortado = true;
          }
          clearTimeout(cronometro);
          if (cancelado || cortado || errorUpstream) {
            try { await reader.cancel(); } catch { /* noop */ }
          }

          if (cancelado) {
            // Lo que el usuario llegó a ver se cobra (usedSlot ya está puesto si
            // hubo texto). Nada más que mandar: nadie escucha.
            usedPrompt = promptTokens;
            usedCompletion = completionTokens;
            break;
          }

          if (!emitted) {
            const motivo = errorUpstream
              ? errorUpstream
              : cortado
                ? "stream cortado antes de responder"
                : isDegenerateOutput(buffered)
                  ? "respuesta vacía (razonamiento se comió el presupuesto)"
                  : "";
            if (motivo) {
              // Respuesta sin contenido o cortada antes de mostrar nada: es un
              // fallo recuperable y el usuario todavía no vio nada.
              ultimoMotivo = motivo;
              marcarFrio(env, waitUntil, upstream, 408, ultimoMotivo);
              continue;
            }
            emitted = true;
            usedSlot = key;
            outChars += buffered.length;
            enviar(delta(buffered));
            buffered = "";
          } else if (cortado || errorUpstream) {
            // Ya había texto en pantalla: no se puede cambiar de modelo sin que
            // se note. Se cierra con lo que llegó y se anota el fallo.
            ultimoMotivo = errorUpstream || "stream cortado a mitad de la respuesta";
            marcarFrio(env, waitUntil, upstream, 408, ultimoMotivo);
          }

          usedPrompt = promptTokens;
          usedCompletion = completionTokens;
          usedTokens = promptTokens + completionTokens || Math.round((messagesCharLen(messages) + outChars) / 4);
          if (!cortado && !errorUpstream) sanarFrio(env, waitUntil, upstream);
          enviar(
            `event: nova\ndata: ${JSON.stringify({ model: slot.label, key, tokens: usedTokens, upstream })}\n\n` +
              "data: [DONE]\n\n"
          );
          break;
        }

        if (!usedSlot && !cancelado) {
          // El usuario recibe lenguaje llano. Los números internos (quedan 32 de
          // 50 requests gratuitos, qué status devolvió cada proveedor) NO van al
          // navegador: se anotan en upstream_health y se ven en el panel admin.
          const msg = falloCredencial
            ? "Nova no puede conectar con sus modelos en este momento. El problema es del servicio, no de tu cuenta: intentá más tarde."
            : "Se cortó la conexión con los modelos. Reintentá en unos segundos: si no vuelve, escribinos por WhatsApp.";
          // El aviso va ANTES del texto: si llega sólo como delta, el frente no
          // tiene cómo saber que no fue una respuesta del modelo y lo sube al canvas.
          enviar(`event: nova\ndata: ${JSON.stringify({ model: null, key: null, error: true })}\n\n`);
          enviar(delta(msg) + "data: [DONE]\n\n");
        }
      } catch {
        /* el cliente cerró la conexión o el upstream se cortó */
      } finally {
        controlActual = null;
        try { request.signal?.removeEventListener?.("abort", cancelar); } catch { /* noop */ }
        try { controller.close(); } catch { /* ya cerrado */ }
        marcarListo({ outChars });
      }
    },
    // El navegador cerró la conexión: Cloudflare cancela el stream de salida.
    cancel() {
      cancelar();
    },
  });

  // ---- registro de consumo: por modelo y acumulado diario ----
  // Corre cuando termina el stream, también si se cortó o el cliente abortó:
  // si hubo texto visible, se cobra (con los tokens reales si llegaron, o con la
  // estimación por caracteres si el corte se llevó el chunk de usage).
  if (userId && env.DB) {
    const day = new Date().toISOString().slice(0, 10);
    waitUntil(
      finished
        .then(async () => {
          // Sin texto entregado no hay nada que cobrar: los intentos fallidos
          // y los aborts antes del primer token no descuentan.
          if (!usedSlot) return;
          // Se anotan los tokens REALES que reportó el proveedor. Antes el
          // acumulado diario usaba caracteres/4, así que "Uso y tokens" mostraba
          // 161 tokens totales mientras el saldo por modelo ya había descontado
          // 1.022 del mismo mes: dos números distintos en la misma pantalla.
          const tokensIn = usedPrompt || Math.round(messagesCharLen(messages) / 4);
          const tokensOut = usedCompletion || Math.round(outChars / 4);
          const total = usedTokens || usedPrompt + usedCompletion || tokensIn + tokensOut;
          if (!total) return;
          await env.DB
            .prepare(
              `INSERT INTO model_usage (user_id, model, month, tokens) VALUES (?, ?, ?, ?)
               ON CONFLICT(user_id, model, month) DO UPDATE SET tokens = tokens + excluded.tokens`
            )
            .bind(userId, usedSlot, month, total)
            .run();
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
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

const messagesCharLen = (msgs) => msgs.reduce((a, m) => a + (m.content || "").length, 0);

// Breaker: anota el fallo y deja al upstream fuera de la lista un rato. Lee el
// contador, calcula el enfriamiento con la fórmula de resiliencia.js (fuente
// única) y escribe una vez. Todo con waitUntil: el usuario ya está esperando.
function marcarFrio(env, waitUntil, upstream, status, reason) {
  if (!env.DB || !upstream) return;
  waitUntil(
    env.DB.prepare("SELECT fails FROM upstream_health WHERE upstream = ?")
      .bind(upstream)
      .first()
      .then((fila) => {
        const nuevos = (fila?.fails || 0) + 1;
        return env.DB.prepare(
          `INSERT INTO upstream_health (upstream, fails, until, last_status, last_reason, updated_at)
           VALUES (?, ?, datetime('now', '+' || ? || ' second'), ?, ?, datetime('now'))
           ON CONFLICT(upstream) DO UPDATE SET
             fails = excluded.fails,
             until = excluded.until,
             last_status = excluded.last_status,
             last_reason = excluded.last_reason,
             updated_at = datetime('now')`
        )
          .bind(upstream, nuevos, cooldownSegun(nuevos), status, String(reason || "").slice(0, 160))
          .run();
      })
      .catch(() => {})
  );
}

function sanarFrio(env, waitUntil, upstream) {
  if (!env.DB || !upstream) return;
  waitUntil(
    env.DB
      .prepare("DELETE FROM upstream_health WHERE upstream = ?")
      .bind(upstream)
      .run()
      .catch(() => {})
  );
}
const fmt = (n) => Math.round(n).toLocaleString("es-AR");

function ssePlaceholder(text) {
  const payload =
    `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n` + `data: [DONE]\n\n`;
  return new Response(payload, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
