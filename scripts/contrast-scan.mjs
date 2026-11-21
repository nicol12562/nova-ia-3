// Auditoría de contraste WCAG 2.x del mundo "Filete".
//
// Uso:
//   node scripts/contrast-scan.mjs                 # lee src/nova.css
//   node scripts/contrast-scan.mjs dist/assets     # lee el .css compilado de esa carpeta
//   node scripts/contrast-scan.mjs ruta/al/archivo.css
//
// 1) Lee los tokens de `:root` (claro) y `body.dark` (oscuro) directamente de la hoja,
//    resolviendo var() encadenados y componiendo rgba() sobre su fondo.
// 2) Verifica una lista de pares texto/fondo (4.5:1) y de indicadores de UI (3:1).
// 3) Escanea reglas con fondo lleno y texto claro (botones, chips) y las mide en ambos temas.
// Sale con código 1 si algún par falla.
import fs from "node:fs";
import path from "node:path";

const arg = process.argv[2] || "src/nova.css";
let file = arg;
if (fs.existsSync(arg) && fs.statSync(arg).isDirectory()) {
  file = path.join(arg, fs.readdirSync(arg).find((x) => x.endsWith(".css")));
}
const src = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

// ---------------------------------------------------------------- tokens
// Solo la primera aparición: las siguientes viven dentro de @media
// (prefers-contrast, forced-colors) y no son los valores por defecto.
const readBlock = (selRe) => {
  const out = {};
  const re = new RegExp(`(?:^|[}\\s,])${selRe}\\s*\\{([^{}]*)\\}`);
  const m = re.exec(src);
  if (m) {
    for (const d of m[1].split(";")) {
      const i = d.indexOf(":");
      if (i < 0) continue;
      const k = d.slice(0, i).trim();
      if (k.startsWith("--")) out[k] = d.slice(i + 1).trim();
    }
  }
  return out;
};
const LIGHT = readBlock(":root");
const DARK = { ...LIGHT, ...readBlock("body\\.dark") };

const parse = (v) => {
  v = v.trim().toLowerCase();
  if (v === "white") return [255, 255, 255, 1];
  if (v === "black") return [0, 0, 0, 1];
  let m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
    const n = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return [...n, h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
  }
  m = v.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p[3] ?? 1];
  }
  return null;
};
const tok = (name, t, seen = new Set()) => {
  if (seen.has(name)) return null;
  seen.add(name);
  const raw = name.startsWith("--") ? t[name] : name;
  if (!raw) return null;
  const v = raw.match(/^var\((--[a-z0-9-]+)(?:,\s*([^)]+))?\)$/i);
  if (v) return tok(v[1], t, seen) ?? (v[2] ? parse(v[2]) : null);
  return parse(raw);
};
const over = (fg, bg) => {
  const a = fg[3];
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)).concat(1);
};
const lum = (c) => {
  const [r, g, b] = c.slice(0, 3).map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
// Resuelve un fondo (posiblemente translúcido) apilado sobre `base`.
const solid = (name, t, base = "--ground") => {
  const c = tok(name, t);
  if (!c) return null;
  if (c[3] >= 1) return c;
  return over(c, solid(base, t));
};
const hex = (c) => "#" + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

// ---------------------------------------------------------------- pares
const TEXT = 4.5, UI = 3;
const pairs = [];
const add = (fgs, bgs, min, note = "", base) =>
  fgs.forEach((fg) => bgs.forEach((bg) => pairs.push({ fg, bg, min, note, base })));

const fondos = ["--ground", "--surface", "--sunk"];
add(["--ink", "--ink-2", "--ink-3"], fondos, TEXT, "texto");
add(["--oro-ink", "--rojo-ink", "--celeste-ink", "--verde-ink"], fondos, TEXT, "texto de estado");
add(["--side-ink", "--side-dim"], ["--side", "--side-hover", "--side-on"], TEXT, "barra lateral", "--side");
add(["--on-primary"], ["--primary", "--primary-hover"], TEXT, "botón primario");
add(["--on-accent"], ["--accent", "--accent-solid"], TEXT, "botón de acento");
add(["--focus"], ["--ground", "--surface", "--sunk"], UI, "anillo de foco");
add(["--oro"], ["--side"], UI, "foco en la barra lateral");
add(["--oro", "--rojo", "--celeste", "--verde"], ["--side"], UI, "punto de modelo en la barra");

const fails = [];
const rows = [];
for (const [mode, t] of [["claro", LIGHT], ["oscuro", DARK]]) {
  for (const p of pairs) {
    const bg = solid(p.bg, t, p.base);
    let fg = tok(p.fg, t);
    if (!bg || !fg) continue;
    if (fg[3] < 1) fg = over(fg, bg);
    const r = ratio(fg, bg);
    const ok = r >= p.min;
    const line = `${ok ? "ok  " : "FALLA"} ${mode.padEnd(6)} ${p.fg.padEnd(13)} sobre ${p.bg.padEnd(14)} ${r.toFixed(2).padStart(5)}:1 (mín ${p.min}) ${hex(fg)}/${hex(bg)}  ${p.note}`;
    rows.push(line);
    if (!ok) fails.push(line);
  }
}

// ------------------------------------------- superficies llenas con texto claro
const state = {};
const re = /([^{}]+)\{([^{}]*)\}/g;
let m;
while ((m = re.exec(src))) {
  const prelude = m[1].trim().replace(/\s+/g, " ");
  if (prelude.startsWith("@") || prelude.startsWith(":root") || prelude.startsWith("body.dark {")) continue;
  const decls = ";" + m[2] + ";";
  const bg = /;\s*(?:background|background-color)\s*:\s*(var\(--[a-z0-9-]+\)|#[0-9a-f]{3,8}|white|black)\s*(?:!important)?\s*;/i.exec(decls);
  const col = /;\s*color\s*:\s*(var\(--[a-z0-9-]+\)|#[0-9a-f]{3,8}|white|black)\s*(?:!important)?\s*;/i.exec(decls);
  for (const raw of prelude.split(",")) {
    const sel = raw.trim();
    if (!sel) continue;
    state[sel] = state[sel] || {};
    if (bg) state[sel].bg = bg[1];
    if (col) state[sel].color = col[1];
  }
}
for (const [sel, v] of Object.entries(state)) {
  if (!v.bg || !v.color) continue;
  for (const [mode, t] of [["claro", LIGHT], ["oscuro", DARK]]) {
    if (sel.startsWith("body.dark") && mode === "claro") continue;
    const bg = tok(v.bg, t), fg = tok(v.color, t);
    if (!bg || !fg || bg[3] < 1 || fg[3] < 1) continue;
    const r = ratio(fg, bg);
    if (r < TEXT) fails.push(`FALLA ${mode.padEnd(6)} ${sel}  color=${v.color} bg=${v.bg}  ${r.toFixed(2)}:1 (${hex(fg)}/${hex(bg)})`);
  }
}

console.log(`Archivo: ${file}\n`);
console.log(rows.join("\n"));
console.log("");
if (fails.length) {
  console.log(`${fails.length} par(es) por debajo del mínimo:\n${fails.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("OK: todos los pares de tokens y las superficies llenas cumplen WCAG AA.");
}
