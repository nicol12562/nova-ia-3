// GET /api/auth/google/start → manda a Google para iniciar sesión o crear cuenta.
// Requiere secretos: GOOGLE_CLIENT_ID (y en callback GOOGLE_CLIENT_SECRET).

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const clientId = env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return new Response(
      `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Nova IA</title>` +
      `<style>body{font-family:system-ui,sans-serif;background:#f6f6f4;display:grid;place-items:center;min-height:100vh;color:#16161a;margin:0}` +
      `div{max-width:440px;text-align:center;padding:40px;border:1px solid #e7e6e2;border-radius:16px;background:#fff}` +
      `a{color:#6c5cf5;font-weight:600;text-decoration:none}</style></head>` +
      `<body><div><h2>Google todavía no está configurado</h2>` +
      `<p>Falta definir los secretos <strong>GOOGLE_CLIENT_ID</strong> y <strong>GOOGLE_CLIENT_SECRET</strong> en Cloudflare.<br>` +
      `Entrá con email y contraseña por ahora.</p>` +
      `<p><a href="/">← Volver a Nova IA</a></p></div></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // State anti-CSRF de un solo uso
  const state = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  await env.DB
    .prepare("INSERT INTO sessions (kind, token, expires_at) VALUES ('oauth_state', ?, datetime('now', '+10 minutes'))")
    .bind(state)
    .run();
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", url.origin + "/api/auth/google/callback");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  return Response.redirect(authUrl.toString(), 302);
}
