// Lógica del canvas sin JSX: decide si una respuesta de Nova es un entregable
// (una pieza) y cómo hay que mostrarla. Está separada de canvas.jsx para poder
// probarla sin levantar React.

// Los agentes que producen algo listo para usar generan pieza aunque la salida
// sea de dos líneas: es justo lo que uno quiere copiar y pegar en WhatsApp.
export const DE_CREACION = new Set(["escritor", "programador", "ventawhats"]);

export const LARGO_MINIMO = 700;

const FENCE = /```([a-zA-Z0-9+#-]*)\n?([\s\S]*?)```/;

export function piezaDe(texto, agenteId) {
  const t = (texto || "").trim();
  if (!t) return null;

  const m = FENCE.exec(t);
  if (m) {
    const cuerpo = m[2].replace(/\s+$/, "");
    if (cuerpo.trim().length > 12) return { kind: "code", lang: (m[1] || "").toLowerCase(), body: cuerpo };
  }

  const esCreacion = DE_CREACION.has(agenteId);
  if (!esCreacion && t.length < LARGO_MINIMO) return null;
  if (t.length < 90 && !esCreacion) return null;
  return { kind: "text", lang: "", body: t };
}

const EXT = {
  python: "py", js: "js", javascript: "js", ts: "ts", typescript: "ts",
  html: "html", css: "css", json: "json", sh: "sh", bash: "sh", sql: "sql", md: "md",
};

export function nombreArchivo(titulo, pieza) {
  const base = (titulo || "nova")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const ext = pieza.kind === "code" ? EXT[pieza.lang] || "txt" : "md";
  return `${base || "nova"}.${ext}`;
}

export function wordCount(texto) {
  return (texto || "").trim().match(/\S+/g) || [];
}
