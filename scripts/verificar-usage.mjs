// Contrato /api/usage <-> frente.
//
// Rompí la página de Uso por renombrar `days` a `dias` en el response y no abrir
// la pantalla después del cambio. Este script pide la API real y verifica que
// cada clave que el código del frente lee esté presente.

const B = process.env.NOVAIA_URL || "https://novaia-4ig.pages.dev";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/141.0" };

// Claves que el frente lee (src/App.jsx, src/pages/{Uso,Home,Planes,Chat}.jsx)
const ESPERADAS = ["days", "total", "totalIn", "totalOut", "plan", "cuota", "modelos", "planes", "racha", "forzado"];
const EN_MODELO = ["key", "label", "desc", "usado", "techo", "restantes", "pct", "agotado", "upstream"];
const EN_PLAN = ["plan", "cuota", "techos"];

const hoy = new Date().toISOString().slice(0, 10);

(async () => {
  const r = await fetch(`${B}/api/usage?from=${hoy.slice(0, 8)}01&to=${hoy}`, { headers: UA });
  if (!r.ok) {
    console.log("FAIL  /api/usage respondió", r.status);
    process.exit(1);
  }
  const d = await r.json();

  const faltantes = ESPERADAS.filter((k) => !(k in d));
  console.log(faltantes.length ? `FAIL  faltan: ${faltantes.join(", ")}` : "PASS  top-level: " + ESPERADAS.join(", "));

  const malModelo = !Array.isArray(d.modelos) || d.modelos.length === 0
    ? "modelos vacío o ausente"
    : EN_MODELO.filter((k) => !(k in d.modelos[0])).join(", ") || null;
  console.log(malModelo ? `FAIL  modelos[]: ${malModelo}` : `PASS  modelos[]: ${d.modelos.length} roles con ${EN_MODELO.length} campos`);

  const malPlanes = !Array.isArray(d.planes) || d.planes.length === 0
    ? "planes vacío o ausente"
    : EN_PLAN.filter((k) => !(k in d.planes[0])).join(", ") || null;
  console.log(malPlanes ? `FAIL  planes[]: ${malPlanes}` : `PASS  planes[]: ${d.planes.map((p) => p.plan).join(", ")}`);

  // Uso.jsx hace data.days.length sin optional chaining: si days no es array, la
  // pantalla entera cae en el ErrorBoundary.
  const daysOk = Array.isArray(d.days);
  console.log(daysOk ? `PASS  days es array (${d.days.length} filas)` : `FAIL  days = ${JSON.stringify(d.days)} -> Uso.jsx rompe`);

  const ok = !faltantes.length && !malModelo && !malPlanes && daysOk;
  console.log(ok ? "\ntodo el contrato ok" : "\nhay contrato roto");
  process.exit(ok ? 0 : 1);
})();
