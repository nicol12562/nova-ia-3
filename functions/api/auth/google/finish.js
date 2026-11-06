// GET /api/auth/google/finish?t=<ticket>
// Canjea el ticket de un solo uso por la sesión del usuario (el frontend lo guarda en localStorage).

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const t = url.searchParams.get("t");
  if (!t) return json({ error: "Falta el ticket de acceso." }, 400);

  const row = await env.DB
    .prepare("SELECT id, user_id FROM sessions WHERE kind = 'ticket' AND token = ? AND expires_at > datetime('now')")
    .bind(t)
    .first();
  if (!row) return json({ error: "El acceso con Google venció. Volvé a intentar." }, 401);

  await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(row.id).run();

  const user = await env.DB
    .prepare("SELECT id, email, name, plan FROM users WHERE id = ?")
    .bind(row.user_id)
    .first();
  if (!user) return json({ error: "No encontramos tu cuenta." }, 404);

  return json({ user });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
