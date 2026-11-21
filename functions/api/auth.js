// POST /api/auth  { action: "login" | "register", name?, email, password }
// La contraseña se verifica con PBKDF2 y la sesión queda en una cookie HttpOnly
// (tabla sessions). El frente guarda una copia de {id,email,name,plan,role} sólo
// para pintar, pero la autoridad es la cookie.

import { crearSesion, conSesion, mismoOrigen } from "../_lib/session.js";
import { limitar, ipDe } from "../_lib/rate.js";

// 100000 es el máximo que acepta crypto.subtle en Cloudflare Workers (más
// lanza NotSupportedError), así que no se puede subir sin cambiar de algoritmo.
const PBKDF2_ITERATIONS = 100000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ERROR_CREDENCIALES = "Email o contraseña incorrectos. Si tu cuenta es de Google, usá 'Continuar con Google'.";

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS },
    key,
    256
  );
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Comparación en tiempo constante (para strings de igual largo, los hex del hash).
function igualesSeguro(a, b) {
  a = String(a || "");
  b = String(b || "");
  let dif = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) dif |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return dif === 0;
}

export async function onRequestPost({ request, env }) {
  // CSRF: solo desde nuestro propio origen, y solo JSON (un <form> cross-site
  // no puede mandar application/json sin preflight).
  if (!mismoOrigen(request)) return json({ error: "Origen no permitido." }, 403);
  const tipo = request.headers.get("Content-Type") || "";
  if (!tipo.toLowerCase().startsWith("application/json")) {
    return json({ error: "Formato no soportado." }, 415);
  }

  const body = await request.json().catch(() => null);
  const action = body?.action === "register" ? "register" : "login";
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (email.length > 254 || !EMAIL_RE.test(email)) return json({ error: "Ingresá un email válido." }, 400);
  if (password.length > 256) return json({ error: "La contraseña es demasiado larga." }, 400);
  if (action === "register" && password.length < 8) {
    return json({ error: "La contraseña necesita al menos 8 caracteres." }, 400);
  }
  if (action === "login" && password.length < 6) return json({ error: ERROR_CREDENCIALES }, 401);

  // 8 intentos de acceso cada 15 minutos y 4 cuentas nuevas por hora, por IP.
  const tope = await limitar(env, `auth:${action}:${ipDe(request)}`, action === "register" ? 4 : 8, action === "register" ? 60 : 15);
  if (!tope.ok) {
    return json(
      { error: action === "register"
          ? "Creaste muchas cuentas desde esta red. Probá más tarde."
          : "Demasiados intentos seguidos. Esperá unos minutos y volvé a probar." },
      429
    );
  }
  // Tope por cuenta además de por IP: frena el password spraying distribuido
  // contra un mismo email desde muchas IPs.
  if (action === "login") {
    const topeCuenta = await limitar(env, `auth:login:email:${email}`, 10, 15);
    if (!topeCuenta.ok) {
      return json({ error: "Demasiados intentos seguidos. Esperá unos minutos y volvé a probar." }, 429);
    }
  }

  const db = env.DB;
  const existing = await db
    .prepare("SELECT id, email, name, plan, role, password_hash, salt FROM users WHERE email = ?")
    .bind(email)
    .first();

  if (action === "register") {
    if (existing) return json({ error: "Ya existe una cuenta con ese email. Iniciá sesión." }, 409);
    const salt = crypto.randomUUID();
    const hash = await hashPassword(password, salt);
    const name = String(body?.name || email.split("@")[0]).slice(0, 60);
    let created;
    try {
      created = await db
        .prepare("INSERT INTO users (email, name, password_hash, salt, plan) VALUES (?, ?, ?, ?, 'gratis')")
        .bind(email, name, hash, salt)
        .run();
    } catch {
      // Carrera con otro registro del mismo email (UNIQUE): mismo mensaje que arriba.
      return json({ error: "Ya existe una cuenta con ese email. Iniciá sesión." }, 409);
    }
    const user = { id: created.meta.last_row_id, email, name, plan: "gratis", role: "user" };
    return conSesion(await crearSesion(env, user.id, request), { user });
  }

  // Siempre se calcula un hash (aunque la cuenta no exista o sea de Google) y el
  // error es el mismo: ni el texto ni el tiempo de respuesta revelan si el email
  // está registrado.
  const tieneClave = !!(existing && existing.password_hash);
  const hash = await hashPassword(password, tieneClave ? existing.salt || "" : "nova-ia-dummy-salt");
  if (!tieneClave || !igualesSeguro(hash, existing.password_hash)) {
    return json({ error: ERROR_CREDENCIALES }, 401);
  }
  const user = { id: existing.id, email: existing.email, name: existing.name, plan: existing.plan, role: existing.role };
  return conSesion(await crearSesion(env, user.id, request), { user });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
