// GET /api/auth/google/callback?code&state
// Intercambia el código con Google, valida el id_token, crea/recupera el usuario
// en D1 y devuelve un ticket de un solo uso que el frontend canjea en /#/google/<ticket>.

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;

  const fail = (motivo) => Response.redirect(`${origin}/#/google/error-${motivo}`, 302);

  if (!clientId || !clientSecret) return fail("no_config");
  if (!code || !state) return fail("faltan_datos");

  // Validamos el state (anti-CSRF) y lo quemamos: un solo uso
  const row = await env.DB
    .prepare("SELECT id FROM sessions WHERE kind = 'oauth_state' AND token = ? AND expires_at > datetime('now')")
    .bind(state)
    .first();
  if (!row) return fail("estado_invalido");
  await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(row.id).run();

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
    tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens?.id_token) return fail("token_invalido");
  } catch {
    return fail("token_invalido");
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
    .prepare("SELECT id, email, name, plan FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (!user) {
    const created = await env.DB
      .prepare("INSERT INTO users (email, name, plan) VALUES (?, ?, 'gratis')")
      .bind(email, name)
      .run();
    user = { id: created.meta.last_row_id, email, name, plan: "gratis" };
  }

  // Ticket de un solo uso para que el frontend tome la sesión
  const ticket = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  await env.DB
    .prepare("INSERT INTO sessions (kind, token, user_id, expires_at) VALUES ('ticket', ?, ?, datetime('now', '+10 minutes'))")
    .bind(ticket, user.id)
    .run();

  return Response.redirect(`${origin}/#/google/${ticket}`, 302);
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
