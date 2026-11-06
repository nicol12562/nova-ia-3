// Tope de intentos por IP, en D1.
//
// Sin esto /api/auth aceptaba infinitas pruebas de contraseña y registros
// ilimitados: 1) se puede crackear una clave débil, 2) cualquiera cosecha
// cuentas gratis para drenear la key de OpenRouter.

// Devuelve { ok, restan }. No lanza: si la tabla falla, dejamos pasar antes
// que cortar el login de toda la gente por un problema de conteo.
export async function limitar(env, clave, limite, ventanaMin) {
  if (!env.DB) return { ok: true, restan: limite };
  const ventana = Math.floor(Date.now() / (60000 * ventanaMin));
  try {
    const actual = await env.DB
      .prepare("SELECT n FROM rate_limits WHERE key = ? AND ventana = ?")
      .bind(clave, ventana)
      .first();
    const n = actual?.n || 0;
    if (n >= limite) return { ok: false, restan: 0 };
    await env.DB
      .prepare(
        `INSERT INTO rate_limits (key, ventana, n) VALUES (?, ?, 1)
         ON CONFLICT(key, ventana) DO UPDATE SET n = n + 1`
      )
      .bind(clave, ventana)
      .run();
    await env.DB
      .prepare("DELETE FROM rate_limits WHERE ventana < ?")
      .bind(ventana - 24)
      .run()
      .catch(() => {});
    return { ok: true, restan: limite - n - 1 };
  } catch {
    return { ok: true, restan: limite };
  }
}

export const ipDe = (request) =>
  request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "sin-ip";
