const B = "https://novaia-4ig.pages.dev";
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/141.0" };

const buenas = [
  "IA en español. Precios en pesos.",
  "Hecho en Argentina",
  "Elegí por uso, no por promesas",
  "formas de responder",
  "Sin tarjeta para empezar",
];
const malas = [
  "El más elegido",
  "Nova Mini Flash",
  "Mensajes ilimitados",
  "el más capaz",
  "mejor calidad",
  "Crear mini agentes",
  "Sin creación de mini agentes",
  "última generación",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let asset = null;
  for (let i = 0; i < 12; i++) {
    const html = await (await fetch(B + "/?v=verify" + Date.now(), { headers: UA })).text();
    asset = (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
    if (asset) break;
    await sleep(6000);
  }
  const js = await (await fetch(B + "/" + asset, { headers: UA })).text();

  console.log("bundle servido:", asset, "| bytes:", js.length);
  console.log("\ncopy nuevo presente:");
  for (const f of buenas) console.log("  ", js.includes(f) ? "OK  " : "FALTA", f);
  console.log("\nclaims sin sostén (debe decir NO en todos):");
  for (const m of malas) console.log("  ", js.includes(m) ? "AUN VIVO" : "no     ", m);

  const u = await (await fetch(B + "/api/usage?from=2026-11-01&to=2026-11-30", { headers: UA })).json();
  console.log("\napi forzado:", u.forzado, "| upstreams:", [...new Set(u.modelos.map((m) => m.upstream))].join(", "));
})();
