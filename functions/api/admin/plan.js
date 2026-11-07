// POST /api/admin/plan  { user_id, plan }
// Cambia el plan de un usuario desde el panel. Misma puerta que el listado:
// cabecera x-admin-key contra el secreto ADMIN_KEY.

// De menor a mayor: Plus es el escalón intermedio y Pro el plan top.
const PLANES = ["gratis", "plus", "pro"];

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ADMIN_KEY) return json({ error: "Falta el secreto ADMIN_KEY en el servidor." }, 503);
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return json({ error: "Clave de administración incorrecta." }, 401);
  }

  const body = await request.json().catch(() => null);
  const userId = Number(body?.user_id);
  const plan = String(body?.plan || "").toLowerCase();

  if (!Number.isInteger(userId) || userId <= 0) return json({ error: "Usuario inválido." }, 400);
  if (!PLANES.includes(plan)) return json({ error: "Plan inválido: usá gratis, plus o pro." }, 400);

  const target = await env.DB.prepare("SELECT id, email, plan FROM users WHERE id = ?").bind(userId).first();
  if (!target) return json({ error: "Ese usuario no existe." }, 404);

  await env.DB.prepare("UPDATE users SET plan = ? WHERE id = ?").bind(plan, userId).run();

  const after = await env.DB.prepare("SELECT id, email, name, plan, role FROM users WHERE id = ?").bind(userId).first();
  return json({ ok: true, antes: target.plan, usuario: after });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
