// Sesión de Nova IA.
//
// Antes de esto el frente mandaba { user_id } en cada request y el server le
// creía: cualquier persona podía leer el email de otro con
// /api/me?user_id=8 o borrarle el historial. La identidad ahora sale de una
// cookie HttpOnly, nunca del cuerpo ni del querystring.
//
// Reusa la tabla `sessions` que ya existía para el state de OAuth y los tickets
// de un solo uso del login con Google (kind='ticket'); acá usamos kind='session'.

export const COOKIE = "novaia_s";
const DIA_DURACION = 30;

const randomToken = () =>
  crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

function cookieAttrs(request, { maxAge = DIA_DURACION * 86400 } = {}) {
  const esHttps = new URL(request.url).protocol === "https:";
  const partes = [
    `${COOKIE}=`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAge}`,
  ];
  // En dev (wrangler pages dev sobre http://localhost) una cookie Secure no se
  // guarda, así que el flag va solo cuando el request entra por https.
  if (esHttps) partes.push(`Secure`);
  return partes;
}

function cookieCabecera(token, request, opts) {
  const attrs = cookieAttrs(request, opts);
  const nombre = attrs.shift(); // "novaia_s="
  return `${nombre}${token || ""};${attrs.join(";")}`;
}

export function cookieLimpiar(request) {
  return cookieCabecera("", request, { maxAge: 0 });
}

// Crea la fila y devuelve el Set-Cookie listo para responder.
export async function crearSesion(env, userId, request) {
  const token = randomToken();
  await env.DB.prepare(
    `INSERT INTO sessions (kind, token, user_id, expires_at)
     VALUES ('session', ?, ?, datetime('now', '+' || ? || ' day'))`
  )
    .bind(token, userId, DIA_DURACION)
    .run();
  // Poda amortizada: sin esto la tabla crece para siempre.
  await env.DB
    .prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')")
    .run()
    .catch(() => {});
  return cookieCabecera(token, request);
}

export async function leerSesion(request, env) {
  const token = tokenDeCookie(request);
  if (!token || !env.DB) return null;
  const row = await env.DB
    .prepare(
      `SELECT u.id, u.email, u.name, u.plan, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.kind = 'session' AND s.token = ? AND s.expires_at > datetime('now')`
    )
    .bind(token)
    .first();
  return row || null;
}

export async function cerrarSesion(request, env) {
  const token = tokenDeCookie(request);
  if (token) {
    await env.DB
      .prepare("DELETE FROM sessions WHERE kind = 'session' AND token = ?")
      .bind(token)
      .run()
      .catch(() => {});
  }
  return cookieLimpiar(request);
}

// Cambios de plan hechos desde el panel se ven al toque: el frente compara
// contra su copia en localStorage, y esa copia la sirve /api/me desde la BD.
export function conSesion(setCookie, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(setCookie ? { "Set-Cookie": setCookie } : {}),
    },
  });
}

function tokenDeCookie(request) {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const parte of header.split(";")) {
    const i = parte.indexOf("=");
    if (i < 0) continue;
    if (parte.slice(0, i).trim() !== COOKIE) continue;
    const v = parte.slice(i + 1).trim();
    // 64 hexes es lo que generamos; cualquier otra cosa se descarta.
    return /^[0-9a-f]{32,96}$/.test(v) ? v : null;
  }
  return null;
}

// Defensa CSRF mínima: con SameSite=Lax los POST cross-site ya no traen cookie,
// pero un navegador viejo o un subdominio compromise pueden. Si el origen no
// coincide, la sesión no se usa.
export function mismoOrigen(request) {
  const origen = request.headers.get("Origin");
  if (!origen) return true;
  try {
    return new URL(origen).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
