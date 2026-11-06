// GET /api/usage?user_id=1&from=2026-10-01&to=2026-10-31
// Consumo por día y totales del período, más el saldo de cada modelo del plan.

import { SLOTS, techoDe, CUOTA } from "../_lib/models.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const userId = Number(url.searchParams.get("user_id"));
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) return json({ error: "Faltan parámetros" }, 400);

  // Sin user_id devolvemos solo los techos del plan Gratis (datos ya publicados),
  // para que el selector de modelo funcione igual en un visitante.
  const rows = userId
    ? (await env.DB
        .prepare(
          "SELECT day, tokens_in, tokens_out FROM usage_daily WHERE user_id = ? AND day >= ? AND day <= ? ORDER BY day"
        )
        .bind(userId, from, to)
        .all()).results
    : [];

  const totalIn = rows.reduce((a, r) => a + (r.tokens_in || 0), 0);
  const totalOut = rows.reduce((a, r) => a + (r.tokens_out || 0), 0);

  // El techo depende del plan real de la cuenta, no de lo que pida el frente.
  const user = userId ? await env.DB.prepare("SELECT plan FROM users WHERE id = ?").bind(userId).first() : null;
  const plan = user?.plan || "gratis";
  const month = from.slice(0, 7) + "-01";
  let usados = {};
  if (userId) {
    const usadosQ = await env.DB
      .prepare("SELECT model, tokens FROM model_usage WHERE user_id = ? AND month = ?")
      .bind(userId, month)
      .all();
    usados = Object.fromEntries((usadosQ.results || []).map((r) => [r.model, r.tokens]));
  }

  const modelos = SLOTS.map((s) => {
    const techo = techoDe(plan, s.key);
    const usado = usados[s.key] || 0;
    return {
      key: s.key,
      label: s.label,
      desc: s.desc,
      usado,
      techo,
      restantes: Math.max(0, techo - usado),
      pct: techo > 0 ? Math.min(100, Math.round((usado / techo) * 100)) : 0,
      agotado: !!userId && techo > 0 && usado >= techo,
    };
  });

  return json({ days: rows, totalIn, totalOut, total: totalIn + totalOut, plan, cuota: CUOTA[plan] ?? CUOTA.gratis, modelos });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
