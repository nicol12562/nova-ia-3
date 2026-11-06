// POST /api/auth  { action: "login" | "register", name?, email, password }
// MVP: devuelve el usuario y el frontend lo guarda en localStorage.
// TODO (hardening): sesión con cookie HttpOnly en vez de localStorage.

const PBKDF2_ITERATIONS = 100000;

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

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => null);
  const action = body?.action === "register" ? "register" : "login";
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");

  if (!email.includes("@")) return json({ error: "Ingresá un email válido." }, 400);
  if (password.length < 6) return json({ error: "La contraseña necesita al menos 6 caracteres." }, 400);

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
    const created = await db
      .prepare("INSERT INTO users (email, name, password_hash, salt, plan) VALUES (?, ?, ?, ?, 'gratis')")
      .bind(email, name, hash, salt)
      .run();
    return json({ user: { id: created.meta.last_row_id, email, name, plan: "gratis", role: "user" } });
  }

  if (!existing || !existing.password_hash) {
    if (existing) return json({ error: "Esta cuenta se creó con Google. Tocá 'Continuar con Google' para entrar." }, 401);
    return json({ error: "Email o contraseña incorrectos." }, 401);
  }
  const hash = await hashPassword(password, existing.salt || "");
  if (hash !== existing.password_hash) return json({ error: "Email o contraseña incorrectos." }, 401);
  return json({ user: { id: existing.id, email: existing.email, name: existing.name, plan: existing.plan, role: existing.role } });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
