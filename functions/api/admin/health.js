// GET /api/admin/health[?probe=1]
//
// Dice si los modelos de los que depende Nova siguen existiendo en OpenRouter.
// No es paranoia: ya se murió llama-3.3-70b-instruct:free y nos enteramos
// porque el chat empezaba a fallar. Acá la escalera de reintentos enmascara un
// upstream roto (queda "no pude obtener una respuesta"), así que esto es lo
// único que lo muestra explícito.
//
//   sin probe → compara los ids contra /api/v1/models (1 request, barato)
//   probe=1   → además manda un chat de 1 token a cada id (cuesta poco, tarda ~2s)

import { SLOTS } from "../../_lib/models.js";

const PLANS = ["gratis", "plus", "pro"];

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.ADMIN_KEY) return json({ error: "Falta el secreto ADMIN_KEY en el servidor." }, 503);
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return json({ error: "Clave de administración incorrecta." }, 401);
  }
  if (!env.OPENROUTER_API_KEY) return json({ error: "Falta OPENROUTER_API_KEY." }, 503);

  const quiereProbe = new URL(request.url).searchParams.get("probe") === "1";

  let catalogo = null;
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
    });
    const data = await res.json();
    catalogo = new Set((data.data || []).map((m) => m.id));
  } catch {
    /* si no se puede leer el catálogo, igual probamos abajo */
  }

  const unicos = [...new Set(SLOTS.flatMap((s) => PLANS.map((p) => s.upstream[p])).filter(Boolean))];

  const items = await Promise.all(
    unicos.map(async (id) => {
      const enCatalogo = catalogo ? (catalogo.has(id) ? "vivo" : "no esta") : "sin catalogo";
      let prueba = null;
      if (quiereProbe) {
        const t0 = Date.now();
        try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: id,
              max_tokens: 1,
              messages: [{ role: "user", content: "ping" }],
            }),
          });
          prueba = res.ok ? `ok ${Date.now() - t0}ms` : `HTTP ${res.status}`;
        } catch (e) {
          prueba = `error ${e?.message || "fetch"}`;
        }
      }
      return { id, enCatalogo, prueba };
    })
  );

  // Qué slot quedaría pelado si un id desaparece.
  const exposicion = SLOTS.map((s) => ({
    slot: s.label,
    porPlan: Object.fromEntries(PLANS.map((p) => {
      const it = items.find((x) => x.id === s.upstream[p]);
      return [p, it?.enCatalogo || "?"];
    })),
  }));

  const rotos = items.filter((i) => i.enCatalogo === "no esta");
  return json({
    ok: rotos.length === 0,
    revisado: new Date().toISOString(),
    totalUpstreams: unicos.length,
    rotos: rotos.map((r) => r.id),
    items,
    exposicion,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
