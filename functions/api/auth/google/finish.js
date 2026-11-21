// GET /api/auth/google/finish?t=<ticket>
// Canjea el ticket de un solo uso por la sesión (cookie HttpOnly). El frente
// guarda una copia del usuario en localStorage sólo para pintar.

import { crearSesion, conSesion } from "../../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const t = url.searchParams.get("t");
  if (!t || !/^[0-9a-f-]{32,128}$/i.test(t)) return json({ error: "Falta el ticket de acceso." }, 400);

  // Canje atómico (DELETE ... RETURNING): un ticket no se puede usar dos veces
  // aunque lleguen dos pedidos a la vez.
  const row = await env.DB
    .prepare("DELETE FROM sessions WHERE kind = 'ticket' AND token = ? AND expires_at > datetime('now') RETURNING id, user_id")
    .bind(t)
    .first();
  if (!row) return json({ error: "El acceso con Google venció. Volvé a intentar." }, 401);

  const user = await env.DB
    .prepare("SELECT id, email, name, plan, role FROM users WHERE id = ?")
    .bind(row.user_id)
    .first();
  if (!user) return json({ error: "No encontramos tu cuenta." }, 404);

  return conSesion(await crearSesion(env, user.id, request), { user });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
