// GET  /api/demo            → tareas disponibles + cupo restante del día
// POST /api/demo {tarea}    → corre ese prompt fijo en los 3 modelos, en paralelo
//
// Es una vitrina: compara estilo y solvencia, no consume el cupo del plan, pero
// sí gasta tokens reales, por eso está limitada por usuario y día.

import { SLOTS, upstreamDe } from "../_lib/models.js";
import { TAREAS, MAX_TOKENS_DEMO, DEMO_POR_DIA, tareaPorId } from "../_lib/demos.js";
import { leerSesion, mismoOrigen } from "../_lib/session.js";

const ROL_BASE =
  "Sos Nova. Respondés en español rioplatense, directo, con markdown prolijo. " +
  "No pidas disculpas ni ofrezcas ayuda extra al final.";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "Método no permitido." }, 405);
  }

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return json({ error: "La demo no está disponible en este momento." }, 503);

  const user = await leerSesion(request, env);
  if (!user) return json({ error: "Iniciá sesión para probar los modelos.", login: true }, 401);
  if (request.method === "POST" && !mismoOrigen(request)) {
    return json({ error: "Origen no permitido." }, 403);
  }
  const userId = user.id;
  const plan = user.role === "admin" ? "pro" : user.plan; // el admin ve el techo más alto

  const day = new Date().toISOString().slice(0, 10);
  const usado = await env.DB
    .prepare("SELECT n FROM demo_usage WHERE user_id = ? AND day = ?")
    .bind(userId, day)
    .first();
  const restantes = Math.max(0, DEMO_POR_DIA - (usado?.n || 0));

  if (request.method === "GET") {
    return json({
      tareas: TAREAS.map(({ id, label, icon, criterio }) => ({ id, label, icon, criterio })),
      restantes,
      modelos: SLOTS.map((s) => ({ key: s.key, label: s.label, desc: s.desc })),
    });
  }

  const agotado = () =>
    json({ error: `Ya usaste las ${DEMO_POR_DIA} pruebas de hoy. Volvé mañana.`, limite: true }, 429);
  if (restantes <= 0) return agotado();

  const body = await request.json().catch(() => null);
  const tarea = typeof body?.tarea === "string" ? tareaPorId(body.tarea) : null;
  if (!tarea) return json({ error: "Esa tarea no existe." }, 400);

  // Reserva atómica ANTES de llamar a los modelos. Antes se contaba al final:
  // varios POST en paralelo veían "quedan 3" y gastaban tokens reales de más.
  const reserva = await env.DB
    .prepare(
      `INSERT INTO demo_usage (user_id, day, n) VALUES (?1, ?2, 1)
       ON CONFLICT(user_id, day) DO UPDATE SET n = n + 1 WHERE n < ?3`
    )
    .bind(userId, day, DEMO_POR_DIA)
    .run();
  if (!reserva?.meta?.changes) return agotado();
  const quedan = await env.DB
    .prepare("SELECT n FROM demo_usage WHERE user_id = ? AND day = ?")
    .bind(userId, day)
    .first();

  const resultados = await Promise.all(
    SLOTS.map(async (s) => {
      const upstream = upstreamDe(plan, s.key, null);
      const t0 = Date.now();
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Title": "Nova IA demo",
          },
          body: JSON.stringify({
            model: upstream,
            messages: [
              { role: "system", content: ROL_BASE },
              { role: "user", content: tarea.prompt },
            ],
            max_tokens: MAX_TOKENS_DEMO,
            // Igual que en /api/chat: el razonamiento no va en la respuesta.
            reasoning: { exclude: true },
          }),
        });
        const j = await res.json().catch(() => ({}));
        const ms = Date.now() - t0;
        if (!res.ok) {
          // El detalle del proveedor queda en el log; al navegador, algo legible.
          console.error("demo upstream", upstream, res.status, j?.error?.message);
          return { key: s.key, label: s.label, ok: false, ms, error: errorLegible(res.status) };
        }
        const texto = j?.choices?.[0]?.message?.content || "";
        return {
          key: s.key,
          label: s.label,
          ok: true,
          ms,
          texto,
          tokens: j?.usage?.total_tokens || Math.round((texto.length + tarea.prompt.length) / 4),
          real: j?.model || upstream,
        };
      } catch (e) {
        console.error("demo upstream", upstream, e);
        return { key: s.key, label: s.label, ok: false, ms: Date.now() - t0, error: errorLegible(0) };
      }
    })
  );

  // Si no respondió ningún modelo, la prueba no cuenta: devolvemos el cupo.
  let usadas = quedan?.n ?? DEMO_POR_DIA;
  if (resultados.every((r) => !r.ok)) {
    await env.DB
      .prepare("UPDATE demo_usage SET n = MAX(0, n - 1) WHERE user_id = ? AND day = ?")
      .bind(userId, day)
      .run()
      .catch(() => {});
    usadas = Math.max(0, usadas - 1);
  }

  return json({
    tarea: { id: tarea.id, label: tarea.label, criterio: tarea.criterio },
    resultados,
    restantes: Math.max(0, DEMO_POR_DIA - usadas),
  });
}

function errorLegible(status) {
  if (status === 429) return "El modelo está saturado ahora. Probá en un rato.";
  if (status === 0) return "No se pudo conectar con el modelo.";
  if (status >= 500) return "El proveedor del modelo tuvo un error.";
  return "El modelo no pudo responder esta vez.";
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
