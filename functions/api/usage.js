// GET /api/usage?user_id=1&from=2026-10-01&to=2026-10-31
// Devuelve el consumo de tokens por día y totales del período.

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const userId = Number(url.searchParams.get("user_id"));
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!userId || !from || !to) return json({ error: "Faltan parámetros" }, 400);

  const { results } = await env.DB
    .prepare(
      "SELECT day, tokens_in, tokens_out FROM usage_daily WHERE user_id = ? AND day >= ? AND day <= ? ORDER BY day"
    )
    .bind(userId, from, to)
    .all();

  const totalIn = results.reduce((a, r) => a + (r.tokens_in || 0), 0);
  const totalOut = results.reduce((a, r) => a + (r.tokens_out || 0), 0);
  return json({ days: results, totalIn, totalOut, total: totalIn + totalOut });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
