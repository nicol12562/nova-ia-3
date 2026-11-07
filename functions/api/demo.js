// GET  /api/demo            → tareas disponibles + cupo restante del día
// POST /api/demo {tarea}    → corre ese prompt fijo en los 3 modelos, en paralelo
//
// Es una vitrina: compara estilo y solvencia, no consume el cupo del plan, pero
// sí gasta tokens reales, por eso está limitada por usuario y día.

import { SLOTS, upstreamDe } from "../_lib/models.js";
import { TAREAS, MAX_TOKENS_DEMO, tareaPorId } from "../_lib/demos.js";
import { leerSesion } from "../_lib/session.js";

const ROL_BASE =
  "Sos Nova. Respondés en español rioplatense, directo, con markdown prolijo. " +
  "No pidas disculpas ni ofrezcas ayuda extra al final.";

export async function onRequest(context) {
  const { request, env } = context;

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return json({ error: "Falta el secreto OPENROUTER_API_KEY." }, 503);

  const url = new URL(request.url);
  const esGet = request.method === "GET";
  let cuerpo = {};
  if (!esGet) cuerpo = await request.json().catch(() => ({}));

  const user = await leerSesion(request, env);
  if (!user) return json({ error: "Iniciá sesión para probar los modelos.", login: true }, 401);
  const userId = user.id;
  const plan = user.role === "admin" ? "pro" : user.plan; // el admin ve el techo más alto

  const day = new Date().toISOString().slice(0, 10);
  const usado = await env.DB
    .prepare("SELECT n FROM demo_usage WHERE user_id = ? AND day = ?")
    .bind(userId, day)
    .first();
  const restantes = Math.max(0, 3 - (usado?.n || 0));

  if (request.method === "GET") {
    return json({
      tareas: TAREAS.map(({ id, label, icon, criterio }) => ({ id, label, icon, criterio })),
      restantes,
      modelos: SLOTS.map((s) => ({ key: s.key, label: s.label, desc: s.desc })),
    });
  }

  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);

  if (restantes <= 0) {
    return json({ error: "Ya usaste las 3 pruebas de hoy. Volvé mañana.", limite: true }, 429);
  }

  const body = cuerpo;
  const tarea = tareaPorId(body?.tarea);
  if (!tarea) return json({ error: "Esa tarea no existe." }, 400);

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
          return { key: s.key, label: s.label, ok: false, ms, error: j?.error?.message || `HTTP ${res.status}` };
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
        return { key: s.key, label: s.label, ok: false, ms: Date.now() - t0, error: String(e?.message || e) };
      }
    })
  );

  await env.DB
    .prepare(
      `INSERT INTO demo_usage (user_id, day, n) VALUES (?, ?, 1)
       ON CONFLICT(user_id, day) DO UPDATE SET n = n + 1`
    )
    .bind(userId, day)
    .run();

  return json({
    tarea: { id: tarea.id, label: tarea.label, criterio: tarea.criterio },
    resultados,
    restantes: restantes - 1,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
