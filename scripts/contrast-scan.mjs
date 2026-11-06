import fs from "node:fs";
import path from "node:path";

const dir = "dist/assets";
const file = path.join(dir, fs.readdirSync(dir).find((x) => x.endsWith(".css")));
const src = fs.readFileSync(file, "utf8");

const state = {};
const re = /([^{}]+)\{([^{}]*)\}/g;
let m;
while ((m = re.exec(src))) {
  const prelude = m[1].trim().replace(/\s+/g, " ");
  if (prelude.startsWith("@") || prelude.startsWith("}")) continue;
  const decls = m[2] + ";";
  const bg = /(?:^|;)\s*(?:background|background-color)\s*:\s*([^;]+)/.exec(decls);
  const col = /(?:^|;)\s*color\s*:\s*([^;]+)/.exec(decls);
  for (const raw of prelude.split(",")) {
    const sel = raw.trim();
    if (!sel) continue;
    state[sel] = state[sel] || {};
    if (bg) state[sel].bg = bg[1].trim();
    if (col) state[sel].color = col[1].trim();
  }
}

const h2r = (h) => {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const lum = (rgb) => {
  const c = h2r(rgb).map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const cr = (a, b) => {
  const x = lum(a), y = lum(b);
  return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2);
};

const LIGHT = { "--accent": "#004de5", "--accent-solid": "#004de5", "--bg": "#ffffff", "--text": "#09090b", "--dark": "#09090b" };
const DARK = { "--accent": "#4d8bff", "--accent-solid": "#1f5fd6", "--bg": "#09090b", "--text": "#fafafa", "--dark": "#fafafa" };

const resolve = (val, t) => {
  const v = val.match(/var\((--[a-z-]+)\)/);
  if (v && t[v[1]]) return t[v[1]];
  if (/^#[0-9a-f]{3,6}$/i.test(val.trim())) return val.trim();
  return null;
};

const hits = [];
for (const [sel, v] of Object.entries(state)) {
  if (!v.bg || !v.color) continue;
  const isAccentBg = /var\(--accent\)|#004de5|#4d8bff/.test(v.bg);
  const isAccentSolid = /var\(--accent-solid\)/.test(v.bg);
  const isDarkBg = /var\(--dark\)|var\(--text\)/.test(v.bg);
  const isLightText = /#fff|^white|var\(--bg\)|var\(--panel\)|var\(--on-accent\)/.test(v.color);
  if (!(isLightText && (isAccentBg || isAccentSolid || isDarkBg))) continue;

  const report = [];
  for (const [mode, t] of [["light", LIGHT], ["dark", DARK]]) {
    if (isDarkBg && mode === "light") continue;
    const bg = resolve(isAccentBg ? "--accent" : isAccentSolid ? "--accent-solid" : "--dark", t);
    const fg = resolve(/#fff|white/.test(v.color) ? "#ffffff" : "--bg", t);
    if (!bg || !fg) continue;
    const ratio = cr(fg, bg);
    if (ratio < 4.5) report.push(`${mode} ${ratio}:1 (${fg} on ${bg})`);
  }
  if (report.length) hits.push(`${sel}  bg=${v.bg} color=${v.color}  ->  ${report.join(", ")}`);
}

console.log(hits.length ? hits.join("\n") : "OK: ninguna superficie llena con texto claro por debajo de 4.5:1");
