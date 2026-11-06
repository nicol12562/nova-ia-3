// POST /api/auth/logout → tira la fila de sessions y limpia la cookie.

import { cerrarSesion } from "../../_lib/session.js";

export async function onRequestPost({ request, env }) {
  const setCookie = await cerrarSesion(request, env);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json", "Set-Cookie": setCookie },
  });
}
