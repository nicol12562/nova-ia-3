// GET  /api/admin/model  → modelo activo y opciones conocidas
// POST /api/admin/model  { model }  → fija el modelo global
// Puerta igual que el resto del panel: cabecera x-admin-key contra ADMIN_KEY.

import { SLOTS } from "../../_lib/models.js";

// La lista de opciones se deriva de SLOTS. Mantener una lista a mano fue cómo
// apareció "meta-llama/llama-3.3-70b-instruct:free" acá, que ya no existe en
// OpenRouter: el panel lo ofrecía y al elegirlo se rompía todo el chat.
const OPCIONES = [...new Set(SLOTS.flatMap((s) => Object.values(s.upstream)))];

export async function onRequest(context) {
  const { request, env } = context;

  if (!env.ADMIN_KEY) return json({ error: "Falta el secreto ADMIN_KEY en el servidor." }, 503);
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return json({ error: "Clave de administración incorrecta." }, 401);
  }

  if (request.method === "GET") {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'model'").first();
    return json({ model: row?.value || null, opciones: OPCIONES });
  }

  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const body = await request.json().catch(() => null);
  const model = String(body?.model || "").trim();

  if (!model) {
    await env.DB.prepare("DELETE FROM settings WHERE key = 'model'").run();
    return json({ ok: true, model: null, modo: "escalera por plan" });
  }
  if (model.length > 120 || /[\x00-\x1f\s]{2,}/.test(model)) return json({ error: "Nombre de modelo inválido." }, 400);

  await env.DB
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES ('model', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(model)
    .run();

  return json({ ok: true, model, modo: "fijo" });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
