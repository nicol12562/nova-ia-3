// Tope de intentos por IP, en D1.
//
// Sin esto /api/auth aceptaba infinitas pruebas de contraseña y registros
// ilimitados: 1) se puede crackear una clave débil, 2) cualquiera cosecha
// cuentas gratis para drenear la key de OpenRouter.

// Devuelve { ok, restan }. No lanza: si la tabla falla, dejamos pasar antes
// que cortar el login de toda la gente por un problema de conteo.
export async function limitar(env, clave, limite, ventanaMin) {
  if (!env.DB) return { ok: true, restan: limite };
  // La ventana se guarda como minuto de inicio (minutos desde epoch) para que
  // todas las filas sean comparables entre sí sin importar su tamaño. Antes era
  // el índice de ventana: la poda de un tope de 15 min (números ~4x mayores)
  // borraba las filas vigentes del tope de 60 min y lo dejaba sin efecto.
  const ahoraMin = Math.floor(Date.now() / 60000);
  const ventana = Math.floor(ahoraMin / ventanaMin) * ventanaMin;
  try {
    // Incremento atómico con RETURNING: con SELECT + INSERT separados, varios
    // pedidos en paralelo leían el mismo n y pasaban todos el tope.
    const fila = await env.DB
      .prepare(
        `INSERT INTO rate_limits (key, ventana, n) VALUES (?, ?, 1)
         ON CONFLICT(key, ventana) DO UPDATE SET n = n + 1
         RETURNING n`
      )
      .bind(clave, ventana)
      .first();
    const n = Number(fila?.n) || 1;
    if (Math.random() < 0.05) {
      await env.DB
        .prepare("DELETE FROM rate_limits WHERE ventana < ?")
        .bind(ahoraMin - 24 * 60)
        .run()
        .catch(() => {});
    }
    if (n > limite) return { ok: false, restan: 0 };
    return { ok: true, restan: limite - n };
  } catch {
    return { ok: true, restan: limite };
  }
}

// Solo cf-connecting-ip: lo pone Cloudflare y el cliente no lo puede falsear.
// X-Forwarded-For sí lo controla el cliente, así que confiar en él permitía
// saltar el tope cambiando el header en cada intento.
export const ipDe = (request) => request.headers.get("cf-connecting-ip") || "sin-ip";
