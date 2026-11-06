// GET /api/me  → la cuenta dueña de la cookie de sesión.
//
// Antes tomaba ?user_id= del querystring, así que cualquier persona podía
// recorrer ids y leer emails ajenos. Ahora el id NO se acepta como parámetro:
// o venís con tu cookie, o te devolvemos user:null.
//
// También es lo que hace que un cambio de plan desde el panel se vea al toque:
// el frente compara esto contra su copia en localStorage.

import { leerSesion } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const user = await leerSesion(request, env);
  return json({ user: user || null });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
