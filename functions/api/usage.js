// GET /api/usage?from=YYYY-MM-DD&to=YYYY-MM-DD
// Consumo por día y totales del período, el saldo de cada modelo del plan y la
// racha de uso. Los datos personales salen de la cookie de sesión, no de un
// ?user_id= que cualquiera puede escribir.

import { SLOTS, techoDe, CUOTA, upstreamDe } from "../_lib/models.js";
import { leerSesion } from "../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from || !to) return json({ error: "Faltan parámetros" }, 400);
  if (!fechaValida(from) || !fechaValida(to)) {
    return json({ error: "Fechas inválidas: usá el formato AAAA-MM-DD." }, 400);
  }
  if (from > to) return json({ error: "La fecha de inicio es posterior a la de fin." }, 400);
  if ((Date.parse(to) - Date.parse(from)) / 864e5 > MAX_DIAS) {
    return json({ error: `El período no puede superar los ${MAX_DIAS} días.` }, 400);
  }

  const user = await leerSesion(request, env);
  const userId = user?.id || null;

  // El admin puede forzar un upstream único; si no se refleja acá, la página
  // mostraría un proveedor que ya no es el que atiende.
  let forzado = null;
  if (env.DB) {
    const fijo = await env.DB.prepare("SELECT value FROM settings WHERE key = 'model'").first();
    if (fijo?.value) forzado = fijo.value;
  }

  // Sin sesión devolvemos sólo los techos del plan Gratis (datos publicados),
  // para que el selector de modelo y la página de planes funcionen igual.
  const rows = userId && env.DB
    ? (await env.DB
        .prepare(
          "SELECT day, tokens_in, tokens_out FROM usage_daily WHERE user_id = ? AND day >= ? AND day <= ? ORDER BY day"
        )
        .bind(userId, from, to)
        .all()).results
    : [];

  const totalIn = rows.reduce((a, r) => a + (r.tokens_in || 0), 0);
  const totalOut = rows.reduce((a, r) => a + (r.tokens_out || 0), 0);

  const plan = user?.plan || "gratis";
  const month = from.slice(0, 7) + "-01";
  let usados = {};
  if (userId && env.DB) {
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
      upstream: forzado || upstreamDe(plan, s.key, null),
      usado,
      techo,
      restantes: Math.max(0, techo - usado),
      pct: techo > 0 ? Math.min(100, Math.round((usado / techo) * 100)) : 0,
      agotado: !!userId && techo > 0 && usado >= techo,
    };
  });

  return json({
    days: rows, totalIn, totalOut, total: totalIn + totalOut, plan,
    forzado: !!forzado,
    cuota: CUOTA[plan] ?? CUOTA.gratis, modelos,
    racha: userId && env.DB ? await racha(env, userId) : 0,
    // Techos de los 3 planes, para que la tabla comparativa no duplique números.
    planes: Object.keys(CUOTA).map((p) => ({
      plan: p,
      cuota: CUOTA[p],
      techos: Object.fromEntries(SLOTS.map((s) => [s.key, s.techo[p]])),
    })),
  });
}

const MAX_DIAS = 366;

// AAAA-MM-DD que además sea una fecha real (no 2026-02-31).
function fechaValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Días consecutivos con actividad, contando hacia atrás desde hoy. Si hoy aún
// no usó Nova, la racha arranca ayer (no se la cortamos por no haber vuelto
// todavía en el día).
async function racha(env, userId) {
  const { results } = await env.DB
    .prepare("SELECT DISTINCT day FROM usage_daily WHERE user_id = ? ORDER BY day DESC LIMIT 120")
    .bind(userId)
    .all();
  const dias = new Set((results || []).map((r) => r.day));
  if (!dias.size) return 0;
  const d = new Date();
  const fmtDate = (x) => x.toISOString().slice(0, 10);
  if (!dias.has(fmtDate(d))) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (dias.has(fmtDate(d))) {
    n += 1;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
