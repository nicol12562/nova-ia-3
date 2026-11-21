// POST /api/auth/logout → tira la fila de sessions y limpia la cookie.

import { cerrarSesion, mismoOrigen } from "../../_lib/session.js";

export async function onRequestPost({ request, env }) {
  // Anti logout-CSRF: otro sitio no puede cerrarle la sesión al usuario.
  if (!mismoOrigen(request)) {
    return new Response(JSON.stringify({ error: "Origen no permitido." }), {
      status: 403,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const setCookie = await cerrarSesion(request, env);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Set-Cookie": setCookie },
  });
}
