// GET /api/me?user_id=1  → estado actual de la cuenta desde D1.
// Sirve para que un cambio de plan hecho en el panel se refleje sin recargar.

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const userId = Number(url.searchParams.get("user_id"));

  if (!Number.isInteger(userId) || userId <= 0) return json({ error: "Usuario inválido." }, 400);

  const user = await env.DB
    .prepare("SELECT id, email, name, plan, role FROM users WHERE id = ?")
    .bind(userId)
    .first();

  if (!user) return json({ error: "No encontramos esa cuenta." }, 404);
  return json({ user });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
