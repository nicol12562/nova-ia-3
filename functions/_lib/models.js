// Catálogo de modelos y techos por plan. Fuente única de verdad: el frente lee
// estos datos desde /api/usage, así no se duplican los números en el bundle.
//
// Los IDs de upstream son los que ya estaban en producción; no se agregan nuevos.

export const SLOTS = [
  {
    key: "flash",
    label: "Nova Flash",
    desc: "Rápido y barato. Es el que más tokens te da.",
    upstream: { gratis: "openrouter/free", pro: "openrouter/free", plus: "openrouter/free" },
    techo: { gratis: 1_000_000, pro: 2_500_000, plus: 5_000_000 },
  },
  {
    key: "pro",
    label: "Nova Pro",
    desc: "Mejor calidad para texto largo y código.",
    upstream: {
      gratis: "meta-llama/llama-3.3-70b-instruct:free",
      pro: "meta-llama/llama-3.3-70b-instruct:free",
      plus: "meta-llama/llama-3.3-70b-instruct:free",
    },
    techo: { gratis: 100_000, pro: 1_500_000, plus: 4_000_000 },
  },
  {
    key: "pro31",
    label: "Nova Pro 3.1",
    desc: "El más capaz. En Gratis se agota enseguida.",
    upstream: {
      gratis: "deepseek/deepseek-v4-flash",
      pro: "deepseek/deepseek-v4-flash",
      plus: "google/gemini-3.8-flash",
    },
    techo: { gratis: 25_000, pro: 750_000, plus: 3_000_000 },
  },
];

// Cuota total del plan por mes. Es el techo global; los de cada modelo viven dentro de este.
export const CUOTA = { gratis: 1_000_000, pro: 2_500_000, plus: 5_000_000 };

// Cuántos tokens de salida pide como máximo cada respuesta, según el plan.
export const MAX_TOKENS = { gratis: 2048, pro: 4096, plus: 8192 };

export const SLOT_KEYS = SLOTS.map((s) => s.key);

export function slotByKey(key) {
  return SLOTS.find((s) => s.key === key) || null;
}

export function techoDe(plan, key) {
  const s = slotByKey(key);
  if (!s) return 0;
  return s.techo[plan] ?? s.techo.gratis;
}

export function upstreamDe(plan, key, forzado) {
  const s = slotByKey(key);
  if (forzado) return forzado;
  if (!s) return null;
  return s.upstream[plan] ?? s.upstream.gratis;
}

// Orden para buscar alternativa cuando el modelo elegido quedó sin saldo.
export function ordenAlternativas(plan, preferido) {
  const idx = SLOTS.findIndex((s) => s.key === preferido);
  const rotados = idx >= 0 ? [...SLOTS.slice(idx), ...SLOTS.slice(0, idx)] : [...SLOTS];
  return rotados.map((s) => s.key);
}
