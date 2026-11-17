// GET /api/auth/google/callback?code&state
// Intercambia el código con Google, valida el id_token, crea/recupera el usuario
// en D1 y devuelve un ticket de un solo uso que el frontend canjea en /#/google/<ticket>.
// Si el login empezó en una vista previa, el ticket vuelve a esa dirección.

import { origenPermitido } from "../../../_lib/oauth.js";

export async function onRequestGet({ request, env }) {
  try {
    return await callback(request, env);
  } catch (e) {
    // Sin esto, un error de D1 o de red deja una página 500 en blanco.
    console.error("google callback:", e?.message || e);
    return Response.redirect(`${new URL(request.url).origin}/#/google/error-servidor`, 302);
  }
}

async function callback(request, env) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;

  // El origen de vuelta va dentro del state (ver start.js). Solo se usa si es
  // propio; ante cualquier duda, el ticket se queda en esta dirección.
  const volverDe = (st) => {
    const parte = String(st || "").split(".")[1];
    if (!parte) return origin;
    try {
      const o = atob(parte.replace(/-/g, "+").replace(/_/g, "/"));
      return origenPermitido(o, env) ? new URL(o).origin : origin;
    } catch {
      return origin;
    }
  };
  let destino = origin;
  const fail = (motivo) => Response.redirect(`${destino}/#/google/error-${motivo}`, 302);

  // Google vuelve con ?error= cuando el usuario cancela o la app no está habilitada.
  const errorGoogle = url.searchParams.get("error");
  if (errorGoogle) {
    destino = volverDe(state);
    return fail(errorGoogle === "access_denied" ? "cancelado" : "google_" + errorGoogle.replace(/[^a-z_]/gi, ""));
  }

  if (!clientId || !clientSecret) return fail("no_config");
  if (!code || !state) return fail("faltan_datos");

  // Validamos el state (anti-CSRF) y lo quemamos: un solo uso
  const row = await env.DB
    .prepare("SELECT id FROM sessions WHERE kind = 'oauth_state' AND token = ? AND expires_at > datetime('now')")
    .bind(state)
    .first();
  if (!row) return fail("estado_invalido");
  await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(row.id).run();
  destino = volverDe(state);

  // Intercambio de código por tokens
  let tokens;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: origin + "/api/auth/google/callback",
        grant_type: "authorization_code",
      }),
    });
    tokens = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokens?.id_token) {
      // El motivo exacto de Google es lo que permite arreglarlo: un secreto mal
      // copiado (invalid_client) no se resuelve igual que un código vencido.
      console.error("google token:", tokenRes.status, tokens?.error, tokens?.error_description);
      const motivo = {
        invalid_client: "cliente_invalido",
        unauthorized_client: "cliente_invalido",
        invalid_grant: "codigo_vencido",
        redirect_uri_mismatch: "redirect_uri",
      }[tokens?.error];
      return fail(motivo || "token_invalido");
    }
  } catch {
    return fail("sin_conexion");
  }

  // Validamos el id_token (audience + vencimiento). El token es auténtico porque
  // lo obtuvimos nosotros directo de Google con el client_secret.
  const payload = b64urlJson(tokens.id_token);
  if (!payload || payload.aud !== clientId || !payload.email) return fail("token_invalido");
  if (payload.exp * 1000 < Date.now()) return fail("token_vencido");
  if (payload.email_verified === false) return fail("email_no_verificado");

  const email = String(payload.email).toLowerCase();
  const name = String(payload.name || email.split("@")[0]).slice(0, 60);

  // Creamos el usuario si es nuevo (o recuperamos el existente)
  let user = await env.DB
    .prepare("SELECT id, email, name, plan, role FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (!user) {
    const created = await env.DB
      .prepare("INSERT INTO users (email, name, plan) VALUES (?, ?, 'gratis')")
      .bind(email, name)
      .run();
    user = { id: created.meta.last_row_id, email, name, plan: "gratis", role: "user" };
  }

  // Ticket de un solo uso para que el frontend tome la sesión
  const ticket = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  await env.DB
    .prepare("INSERT INTO sessions (kind, token, user_id, expires_at) VALUES ('ticket', ?, ?, datetime('now', '+10 minutes'))")
    .bind(ticket, user.id)
    .run();

  return Response.redirect(`${destino}/#/google/${ticket}`, 302);
}

// Decodifica el payload de un JWT base64url
function b64urlJson(token) {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
