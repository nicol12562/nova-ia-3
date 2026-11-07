import { piezaDe, nombreArchivo, wordCount } from "../src/piece.js";

const largo = "x".repeat(400) + " " + "y".repeat(400); // >700 chars

const casos = [
  {
    nombre: "respuesta corta de dato",
    texto: "La capital de Australia es Canberra.",
    agente: null,
    espera: null,
  },
  {
    nombre: "respuesta mediana sin código",
    texto: "Te lo explico en tres puntos. Primero, el índice acelera las búsquedas. Segundo, ocupa espacio extra. Tercero, hay que mantenerlo.",
    agente: null,
    espera: null,
  },
  {
    nombre: "texto largo tipo artículo",
    texto: largo,
    agente: null,
    espera: { kind: "text" },
  },
  {
    nombre: "bloque de código python",
    texto: "Acá lo tienes:\n\n```python\ndef suma(a, b):\n    return a + b\n```",
    agente: null,
    espera: { kind: "code", lang: "python" },
  },
  {
    nombre: "código muy corto (una palabra)",
    texto: "Probá `ls`.",
    agente: null,
    espera: null,
  },
  {
    nombre: "agente de ventas, respuesta de 1 línea",
    texto: "Sí, tenemos la 42 en negro. Sale $38.000 con envío.",
    agente: "ventawhats",
    espera: { kind: "text" },
  },
  {
    nombre: "respuesta vacía",
    texto: "   ",
    agente: null,
    espera: null,
  },
  {
    nombre: "fence sin lenguaje (como lo emite un modelo)",
    texto: "```\nnpm run build && npm test\n```",
    agente: null,
    espera: { kind: "code", lang: "" },
  },
];

let ok = 0;
for (const c of casos) {
  const r = piezaDe(c.texto, c.agente);
  const got = r ? { kind: r.kind, ...(r.kind === "code" ? { lang: r.lang } : {}) } : null;
  const igual = JSON.stringify(got) === JSON.stringify(c.espera);
  if (igual) ok++;
  console.log(igual ? "PASS" : "FAIL", "|", c.nombre.padEnd(38), "→", JSON.stringify(got), igual ? "" : `(esperaba ${JSON.stringify(c.espera)})`);
}

const archivos = [
  ["Armá un presupuesto con seña y envío", { kind: "text" }, "arma-un-presupuesto-con-sena-y-envio.md"],
  ["Escribí código Python Ñandú", { kind: "code", lang: "python" }, "escribi-codigo-python-nandu.py"],
  ["", { kind: "code", lang: "javascript" }, "nova.js"],
];
for (const [t, pieza, esperado] of archivos) {
  const got = nombreArchivo(t, pieza);
  const igual = got === esperado;
  if (igual) ok++;
  console.log(igual ? "PASS" : "FAIL", "| nombre de archivo", JSON.stringify(got), igual ? "" : `(esperaba ${esperado})`);
}

console.log("\npalabras en \"hola cómo andas\":", wordCount("hola cómo andas").length);
console.log(`\n${ok}/${casos.length + archivos.length} casos pasan`);
process.exit(ok === casos.length + archivos.length ? 0 : 1);
