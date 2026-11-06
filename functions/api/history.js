// Conversaciones y mensajes
// GET    /api/history?user_id=1              → lista de conversaciones
// GET    /api/history?user_id=1&conv_id=5    → una conversación con sus mensajes
// POST   /api/history { user_id, conv_id?, role, content } → agrega mensaje (crea la conversación si falta)
// DELETE /api/history?user_id=1&id=5         → elimina una conversación
// DELETE /api/history?user_id=1              → elimina todo el historial

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const userId = Number(url.searchParams.get("user_id"));
  const convId = Number(url.searchParams.get("conv_id"));
  if (!userId) return json({ error: "Falta user_id" }, 400);
  const db = env.DB;

  if (convId) {
    const conv = await db
      .prepare("SELECT id, title, created_at FROM conversations WHERE id = ? AND user_id = ?")
      .bind(convId, userId)
      .first();
    if (!conv) return json({ error: "Conversación no encontrada" }, 404);
    const { results } = await db
      .prepare("SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id")
      .bind(convId)
      .all();
    return json({ conversation: conv, messages: results });
  }

  const { results } = await db
    .prepare(
      `SELECT c.id, c.title, c.created_at, COUNT(m.id) AS mensajes
       FROM conversations c LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.user_id = ?
       GROUP BY c.id ORDER BY c.id DESC`
    )
    .bind(userId)
    .all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  const userId = Number(b?.user_id);
  const role = b?.role === "assistant" ? "assistant" : "user";
  const content = String(b?.content || "").slice(0, 20000);
  if (!userId || !content) return json({ error: "Datos incompletos" }, 400);
  const db = env.DB;

  let convId = Number(b?.conv_id) || null;
  if (convId) {
    const owned = await db
      .prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?")
      .bind(convId, userId)
      .first();
    if (!owned) convId = null; // no es suya → arranca una nueva
  }
  if (!convId) {
    const title = content.slice(0, 60) + (content.length > 60 ? "…" : "");
    const created = await db
      .prepare("INSERT INTO conversations (user_id, title) VALUES (?, ?)")
      .bind(userId, title)
      .run();
    convId = created.meta.last_row_id;
  }

  await db
    .prepare("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)")
    .bind(convId, role, content)
    .run();
  return json({ conversation_id: convId });
}

export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url);
  const userId = Number(url.searchParams.get("user_id"));
  const convId = Number(url.searchParams.get("id"));
  if (!userId) return json({ error: "Falta user_id" }, 400);
  const db = env.DB;

  if (convId) {
    await db.prepare("DELETE FROM messages WHERE conversation_id = ?").bind(convId).run();
    await db
      .prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?")
      .bind(convId, userId)
      .run();
  } else {
    await db
      .prepare("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)")
      .bind(userId)
      .run();
    await db.prepare("DELETE FROM conversations WHERE user_id = ?").bind(userId).run();
  }
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
