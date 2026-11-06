// Conversaciones y mensajes. La identidad sale de la cookie de sesión.
//
//   GET    /api/history                → lista de mis conversaciones
//   GET    /api/history?conv_id=5      → una mía, con sus mensajes
//   GET    /api/history?q=texto        → búsqueda en mis mensajes
//   POST   /api/history { conv_id?, role, content, pinned? }
//   DELETE /api/history?id=5           → borra una mía
//   DELETE /api/history                → borra todo mi historial
//
// Antes el user_id venía en el body/query: cualquiera leía o BORRABA la
// conversación de otro simplemente cambiando un número.

import { leerSesion, mismoOrigen } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const user = await leerSesion(request, env);
  if (!user) return json({ error: "Iniciá sesión para ver tu historial." }, 401);

  const url = new URL(request.url);
  const convId = Number(url.searchParams.get("conv_id"));
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const db = env.DB;

  if (convId) {
    const conv = await db
      .prepare("SELECT id, title, pinned, created_at FROM conversations WHERE id = ? AND user_id = ?")
      .bind(convId, user.id)
      .first();
    if (!conv) return json({ error: "Conversación no encontrada" }, 404);
    const { results } = await db
      .prepare("SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id")
      .bind(convId)
      .all();
    return json({ conversation: conv, messages: results });
  }

  // Búsqueda: sólo sobre las conversaciones de esta cuenta.
  if (q) {
    const { results } = await db
      .prepare(
        `SELECT DISTINCT c.id, c.title, c.pinned, c.created_at,
                substr(m.content, 1, 160) AS extracto
         FROM conversations c
         JOIN messages m ON m.conversation_id = c.id
         WHERE c.user_id = ? AND m.content LIKE ?
         ORDER BY c.id DESC LIMIT 30`
      )
      .bind(user.id, `%${q.replace(/[%_]/g, "")}%`)
      .all();
    return json({ busqueda: q, resultados: results });
  }

  const { results } = await db
    .prepare(
      `SELECT c.id, c.title, c.pinned, c.created_at, COUNT(m.id) AS mensajes
       FROM conversations c LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.pinned DESC, c.id DESC`
    )
    .bind(user.id)
    .all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const user = await leerSesion(request, env);
  if (!user) return json({ error: "Iniciá sesión para guardar el chat." }, 401);
  if (!mismoOrigen(request)) return json({ error: "Origen no permitido." }, 403);

  const b = await request.json().catch(() => null);
  const role = b?.role === "assistant" ? "assistant" : "user";
  const content = String(b?.content || "").slice(0, 20000);
  if (!content) return json({ error: "Falta el contenido." }, 400);
  const db = env.DB;

  // Fijar/soltar desde la lista del sidebar.
  if (b?.accion === "fijar") {
    const convId = Number(b?.conv_id);
    if (!convId) return json({ error: "Falta conv_id." }, 400);
    await db
      .prepare("UPDATE conversations SET pinned = 1 - pinned WHERE id = ? AND user_id = ?")
      .bind(convId, user.id)
      .run();
    return json({ ok: true });
  }

  let convId = Number(b?.conv_id) || null;
  if (convId) {
    const owned = await db
      .prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?")
      .bind(convId, user.id)
      .first();
    if (!owned) convId = null; // no es suya → arranca una nueva
  }
  if (!convId) {
    const title = content.slice(0, 60) + (content.length > 60 ? "…" : "");
    const created = await db
      .prepare("INSERT INTO conversations (user_id, title) VALUES (?, ?)")
      .bind(user.id, title)
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
  const user = await leerSesion(request, env);
  if (!user) return json({ error: "Iniciá sesión para borrar." }, 401);
  if (!mismoOrigen(request)) return json({ error: "Origen no permitido." }, 403);

  const url = new URL(request.url);
  const convId = Number(url.searchParams.get("id"));
  const db = env.DB;

  if (convId) {
    // Borramos la conversación si es de esta cuenta; antes borraba los mensajes
    // primero sin verificar la propiedad.
    const owned = await db
      .prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?")
      .bind(convId, user.id)
      .first();
    if (!owned) return json({ error: "Conversación no encontrada" }, 404);
    await db.prepare("DELETE FROM messages WHERE conversation_id = ?").bind(convId).run();
    await db.prepare("DELETE FROM conversations WHERE id = ?").bind(convId).run();
  } else {
    await db
      .prepare("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)")
      .bind(user.id)
      .run();
    await db.prepare("DELETE FROM conversations WHERE user_id = ?").bind(user.id).run();
  }
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
