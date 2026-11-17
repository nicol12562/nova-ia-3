// Login con Google desde cualquier dirección del proyecto.
//
// Google solo acepta volver a las direcciones registradas en la consola
// (hoy, https://novaia-4ig.pages.dev/api/auth/google/callback), y los secretos
// GOOGLE_CLIENT_* viven solo en el entorno de producción. Por eso el ida y
// vuelta con Google pasa siempre por la dirección canónica, y al final el
// ticket se canjea en la dirección donde el usuario empezó (una vista previa,
// un alias), que es donde tiene que quedar la cookie.

const CANON_DEFAULT = "https://novaia-4ig.pages.dev";

export function origenCanonico(env) {
  try {
    return new URL(env.OAUTH_ORIGIN || CANON_DEFAULT).origin;
  } catch {
    return CANON_DEFAULT;
  }
}

// En desarrollo local (wrangler pages dev) no se rebota: la base local no es
// la de producción, así que el ticket no aparecería. Ahí se usan los secretos
// de .dev.vars y una URI de retorno de localhost registrada en Google.
//
// Solo se devuelve el ticket a direcciones propias: si no, cualquiera podría
// pedir que el ticket de otro le llegue a su dominio.
export function origenPermitido(origen, env) {
  let u;
  try {
    u = new URL(origen);
  } catch {
    return false;
  }
  const canon = new URL(origenCanonico(env));
  if (u.origin === canon.origin) return true;
  if (u.protocol === "https:" && u.hostname.endsWith("." + canon.hostname)) return true;
  const extra = String(env.OAUTH_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(u.origin);
}
