// Memoria del usuario.
//   GET    /api/memories      → mis notas
//   POST   /api/memories { note }
//   DELETE /api/memories?id=3
//
// Todo identificado por la cookie de sesión; no existe forma de leer o tocar
// la nota de otra cuenta.

import { leerSesion, mismoOrigen } from "../_lib/session.js";
import { notasDe, limpiarNota, LIMITE_NOTAS } from "../_lib/memoria.js";

export async function onRequestGet({ request, env }) {
  const user = await leerSesion(request, env);
  if (!user) return json({ error: "Iniciá sesión." }, 401);
  return json({ notas: await notasDe(env, user.id), limite: LIMITE_NOTAS });
}

export async function onRequestPost({ request, env }) {
  const user = await leerSesion(request, env);
  if (!user) return json({ error: "Iniciá sesión." }, 401);
  if (!mismoOrigen(request)) return json({ error: "Origen no permitido." }, 403);

  const b = await request.json().catch(() => null);
  const note = limpiarNota(b?.note);
  if (!note) return json({ error: "Escribí algo primero." }, 400);

  const conteo = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM memories WHERE user_id = ?")
    .bind(user.id)
    .first();
  if ((conteo?.n || 0) >= LIMITE_NOTAS) {
    return json({ error: `Llegaste a las ${LIMITE_NOTAS} notas. Borra alguna para agregar otra.` }, 409);
  }

  const created = await env.DB
    .prepare("INSERT INTO memories (user_id, note) VALUES (?, ?)")
    .bind(user.id, note)
    .run();
  return json({ ok: true, id: created.meta.last_row_id, note });
}

export async function onRequestDelete({ request, env }) {
  const user = await leerSesion(request, env);
  if (!user) return json({ error: "Iniciá sesión." }, 401);
  if (!mismoOrigen(request)) return json({ error: "Origen no permitido." }, 403);

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return json({ error: "Falta el id." }, 400);
  await env.DB.prepare("DELETE FROM memories WHERE id = ? AND user_id = ?").bind(id, user.id).run();
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
