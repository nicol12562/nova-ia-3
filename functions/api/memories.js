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
  if (b?.note != null && typeof b.note !== "string") {
    return json({ error: "La nota tiene que ser texto." }, 400);
  }
  const note = limpiarNota(b?.note);
  if (!note) return json({ error: "Escribí algo primero." }, 400);

  // Conteo e inserción en una sola sentencia: con dos pasos, varios POST en
  // paralelo pasaban el chequeo a la vez y superaban el límite.
  const created = await env.DB
    .prepare(
      `INSERT INTO memories (user_id, note)
       SELECT ?1, ?2 WHERE (SELECT COUNT(*) FROM memories WHERE user_id = ?1) < ?3`
    )
    .bind(user.id, note, LIMITE_NOTAS)
    .run();
  if (!created?.meta?.changes) {
    return json({ error: `Llegaste a las ${LIMITE_NOTAS} notas. Borrá alguna para agregar otra.` }, 409);
  }
  return json({ ok: true, id: created.meta.last_row_id, note });
}

export async function onRequestDelete({ request, env }) {
  const user = await leerSesion(request, env);
  if (!user) return json({ error: "Iniciá sesión." }, 401);
  if (!mismoOrigen(request)) return json({ error: "Origen no permitido." }, 403);

  const crudo = String(new URL(request.url).searchParams.get("id") ?? "").trim();
  const id = /^[1-9]\d{0,15}$/.test(crudo) ? Number(crudo) : 0;
  if (!Number.isSafeInteger(id) || id <= 0) return json({ error: "Falta el id." }, 400);
  await env.DB.prepare("DELETE FROM memories WHERE id = ? AND user_id = ?").bind(id, user.id).run();
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
