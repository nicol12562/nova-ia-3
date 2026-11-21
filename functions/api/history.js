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

const MAX_CONTENIDO = 20000;
const MAX_CONVERSACIONES = 500;
const MAX_MENSAJES = 2000;

// Entero positivo seguro o null. Number("1e3"), "1.5", "-2" o "abc" no pasan.
function idValido(v) {
  const s = String(v ?? "").trim();
  if (!/^[1-9]\d{0,15}$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

export async function onRequestGet({ request, env }) {
  const user = await leerSesion(request, env);
  if (!user) return json({ error: "Iniciá sesión para ver tu historial." }, 401);

  const url = new URL(request.url);
  const convParam = url.searchParams.get("conv_id");
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const db = env.DB;

  if (convParam !== null) {
    const convId = idValido(convParam);
    if (!convId) return json({ error: "Conversación inválida." }, 400);
    const conv = await db
      .prepare("SELECT id, title, pinned, created_at FROM conversations WHERE id = ? AND user_id = ?")
      .bind(convId, user.id)
      .first();
    if (!conv) return json({ error: "Conversación no encontrada" }, 404);
    const { results } = await db
      .prepare("SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id LIMIT ?")
      .bind(convId, MAX_MENSAJES)
      .all();
    return json({ conversation: conv, messages: results });
  }

  // Búsqueda: sólo sobre las conversaciones de esta cuenta.
  if (q) {
    const { results } = await db
      .prepare(
        `SELECT c.id, c.title, c.pinned, c.created_at,
                substr(MIN(m.content), 1, 160) AS extracto
         FROM conversations c
         JOIN messages m ON m.conversation_id = c.id
         WHERE c.user_id = ? AND m.content LIKE ? ESCAPE '\\'
         GROUP BY c.id
         ORDER BY c.id DESC LIMIT 30`
      )
      .bind(user.id, `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`)
      .all();
    return json({ busqueda: q, resultados: results });
  }

  const { results } = await db
    .prepare(
      `SELECT c.id, c.title, c.pinned, c.created_at, COUNT(m.id) AS mensajes
       FROM conversations c LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.pinned DESC, c.id DESC
       LIMIT ?`
    )
    .bind(user.id, MAX_CONVERSACIONES)
    .all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const user = await leerSesion(request, env);
  if (!user) return json({ error: "Iniciá sesión para guardar el chat." }, 401);
  if (!mismoOrigen(request)) return json({ error: "Origen no permitido." }, 403);

  const b = await request.json().catch(() => null);
  if (!b || typeof b !== "object") return json({ error: "Pedido inválido." }, 400);
  const role = b?.role === "assistant" ? "assistant" : "user";
  const db = env.DB;

  // Fijar/soltar desde la lista: no trae contenido, va antes de la validación.
  if (b?.accion === "fijar") {
    const convId = idValido(b?.conv_id);
    if (!convId) return json({ error: "Falta conv_id." }, 400);
    const r = await db
      .prepare("UPDATE conversations SET pinned = 1 - pinned WHERE id = ? AND user_id = ?")
      .bind(convId, user.id)
      .run();
    if (!r?.meta?.changes) return json({ error: "Conversación no encontrada" }, 404);
    return json({ ok: true });
  }

  if (b.content != null && typeof b.content !== "string") {
    return json({ error: "El contenido tiene que ser texto." }, 400);
  }
  const content = String(b.content || "").slice(0, MAX_CONTENIDO);
  if (!content.trim()) return json({ error: "Falta el contenido." }, 400);

  let convId = idValido(b?.conv_id);
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
  const idParam = url.searchParams.get("id");
  const db = env.DB;

  // Ojo: antes un ?id=abc daba NaN, caía al else y BORRABA TODO el historial.
  // Si vino un id, tiene que ser válido; sólo la ausencia total significa "todo".
  if (idParam !== null) {
    const convId = idValido(idParam);
    if (!convId) return json({ error: "Conversación inválida." }, 400);
    // Borramos la conversación si es de esta cuenta; antes borraba los mensajes
    // primero sin verificar la propiedad.
    const owned = await db
      .prepare("SELECT id FROM conversations WHERE id = ? AND user_id = ?")
      .bind(convId, user.id)
      .first();
    if (!owned) return json({ error: "Conversación no encontrada" }, 404);
    await db.batch([
      db.prepare("DELETE FROM messages WHERE conversation_id = ?").bind(convId),
      db.prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?").bind(convId, user.id),
    ]);
  } else {
    await db.batch([
      db
        .prepare("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ?)")
        .bind(user.id),
      db.prepare("DELETE FROM conversations WHERE user_id = ?").bind(user.id),
    ]);
  }
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
