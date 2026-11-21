import React, { useEffect, useMemo, useRef, useState } from "react";
import { copyText } from "./ui.jsx";
import { Icon } from "./icons.jsx";

/* ------------------------------------------------------------------
   Mini renderizador de markdown para las respuestas de Nova.
   Sin dependencias: negrita, itálica, tachado, `código`, links
   (solo http/https/mailto/tel), listas anidadas y de tareas, títulos,
   citas con bloques adentro, separadores, tablas con alineación y
   bloques de código (``` o ~~~, abiertos durante el streaming) con
   botón de copiado.
   ------------------------------------------------------------------ */

/* ---------------------------------------------------------- links */

const SAFE_PROTOCOL = /^(https?:|mailto:|tel:)/i;

/** Devuelve el href si es seguro (http, https, mailto, tel); si no, null. */
export function safeHref(raw) {
  if (!raw) return null;
  // Se quitan espacios y caracteres de control que los navegadores ignoran
  // ("java\tscript:" sigue siendo javascript:).
  const href = String(raw).trim().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  if (!SAFE_PROTOCOL.test(href)) return null;
  return href;
}

/** En una URL suelta, la puntuación final y un ")" sin pareja no son parte del link. */
function trimUrl(url) {
  let u = url.replace(/[.,;:!?'"*_~]+$/, "");
  while (u.endsWith(")") && (u.match(/\(/g) || []).length < (u.match(/\)/g) || []).length) {
    u = u.slice(0, -1).replace(/[.,;:!?'"*_~]+$/, "");
  }
  return u;
}

function Link({ href, children, k }) {
  const safe = safeHref(href);
  if (!safe) return <span key={k}>{children}</span>;
  const external = /^https?:/i.test(safe);
  return (
    <a key={k} href={safe} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
      {children}
    </a>
  );
}

/* --------------------------------------------------------- inline */

const INLINE_PATTERNS = [
  // \* \_ \` ... → el carácter literal
  { re: /\\([\\`*_{}[\]()#+\-.!|~<>])/, make: (m) => m[1] },
  {
    re: /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
    make: (m, k) => (
      <code key={k} className="md-ic">
        {m[2].replace(/^ (.*) $/s, "$1")}
      </code>
    ),
  },
  {
    re: /<((?:https?:\/\/|mailto:)[^\s<>]+)>/i,
    make: (m, k) => Link({ href: m[1], k, children: m[1] }),
  },
  {
    // [texto](url "título") — admite paréntesis balanceados dentro de la URL.
    re: /\[((?:[^[\]\\]|\\.|\[[^\]]*\])+)\]\(\s*<?((?:[^()\s<>]|\([^()\s]*\))+)>?(?:\s+["'][^"']*["'])?\s*\)/,
    make: (m, k, ctx) => Link({ href: m[2], k, children: inline(m[1], k + "l", { ...ctx, noLinks: true }) }),
    link: true,
  },
  {
    re: /\bhttps?:\/\/[^\s<>"`]+/i,
    make: (m, k) => {
      const url = trimUrl(m[0]);
      return [Link({ href: url, k, children: url }), m[0].slice(url.length)];
    },
    link: true,
  },
  {
    re: /\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*\*)/,
    make: (m, k, ctx) => <strong key={k}>{inline(m[1], k + "b", ctx)}</strong>,
  },
  {
    re: /(?<![\w_])__(?=\S)([\s\S]*?\S)__(?![\w_])/,
    make: (m, k, ctx) => <strong key={k}>{inline(m[1], k + "b", ctx)}</strong>,
  },
  {
    re: /~~(?=\S)([\s\S]*?\S)~~/,
    make: (m, k, ctx) => <del key={k}>{inline(m[1], k + "d", ctx)}</del>,
  },
  {
    re: /(?<![*\w\\])\*(?=[^\s*])((?:[^*\n]|\*\*[^*\n]+\*\*)*?[^\s*])\*(?!\*)/,
    make: (m, k, ctx) => <em key={k}>{inline(m[1], k + "e", ctx)}</em>,
  },
  {
    // _itálica_ solo con bordes de palabra: no rompe nombres_con_guiones.
    re: /(?<![\w_\\])_(?=[^\s_])([^_\n]*?[^\s_])_(?![\w_])/,
    make: (m, k, ctx) => <em key={k}>{inline(m[1], k + "e", ctx)}</em>,
  },
];

function inline(text, keyBase = "k", ctx = {}) {
  if (!text) return null;
  const out = [];
  let rest = text;
  let n = 0;
  while (rest) {
    let best = null;
    for (const p of INLINE_PATTERNS) {
      if (p.link && ctx.noLinks) continue;
      const m = p.re.exec(rest);
      if (m && (best === null || m.index < best.m.index)) best = { p, m };
    }
    if (!best) {
      out.push(rest);
      break;
    }
    const { p, m } = best;
    if (m.index) out.push(rest.slice(0, m.index));
    const made = p.make(m, `${keyBase}.${n++}`, ctx);
    if (Array.isArray(made)) out.push(...made.filter((x) => x !== ""));
    else out.push(made);
    rest = rest.slice(m.index + m[0].length);
  }
  // Fragmentos de texto sueltos no necesitan key; los elementos ya la traen.
  return out.length === 1 ? out[0] : out.map((x, i) => (typeof x === "string" ? <React.Fragment key={"t" + i}>{x}</React.Fragment> : x));
}

/** Párrafo: un salto de línea simple se respeta como <br>, como en un chat. */
function inlineLines(text, keyBase) {
  const lines = text.split("\n");
  if (lines.length === 1) return inline(text, keyBase);
  return lines.map((l, j) => (
    <React.Fragment key={j}>
      {j > 0 && <br />}
      {inline(l, keyBase + "_" + j)}
    </React.Fragment>
  ));
}

/* --------------------------------------------------------- bloques */

const LIST_RE = /^(\s*)([-*+]|\d{1,9}[.)])(\s+|$)/;
const FENCE_OPEN_RE = /^(\s*)(`{3,}|~{3,})\s*([^`\s]*)[^`]*$/;
const HEAD_RE = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const HR_RE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE_RE = /^\s{0,3}>/;
const BLANK_RE = /^\s*$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

const indentOf = (l) => l.match(/^\s*/)[0].length;

function isTableStart(lines, i) {
  return (
    i + 1 < lines.length &&
    lines[i].includes("|") &&
    TABLE_SEP_RE.test(lines[i + 1]) &&
    (lines[i + 1].includes("|") || /^\s*\|/.test(lines[i]))
  );
}

function startsBlock(lines, i) {
  const l = lines[i];
  return (
    FENCE_OPEN_RE.test(l) ||
    HEAD_RE.test(l) ||
    QUOTE_RE.test(l) ||
    HR_RE.test(l) ||
    LIST_RE.test(l) ||
    isTableStart(lines, i)
  );
}

/** Separa una fila de tabla en celdas, respetando \| y los | dentro de `código`. */
function splitRow(row) {
  const s = row.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  const cells = [];
  let cur = "";
  let tick = 0;
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i];
    if (c === "\\" && s[i + 1] === "|") {
      cur += "|";
      i += 1;
    } else if (c === "`") {
      tick = tick ? 0 : 1;
      cur += c;
    } else if (c === "|" && !tick) {
      cells.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

function alignOf(cell) {
  const l = cell.startsWith(":");
  const r = cell.endsWith(":");
  return l && r ? "center" : r ? "right" : l ? "left" : null;
}

/** Normaliza lo que los modelos mandan mal, fuera de los bloques de código. */
function normalize(src) {
  let fence = null;
  return String(src)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      const f = FENCE_OPEN_RE.exec(line);
      if (fence) {
        if (f && f[2][0] === fence[0] && f[2].length >= fence.length && !f[3]) fence = null;
        return line;
      }
      if (f) {
        fence = f[2];
        return line;
      }
      // Tabulaciones de sangría → 4 espacios, para medir la anidación.
      line = line.replace(/^\t+/, (t) => "    ".repeat(t.length));
      // Listas con el número en negrita ("**1. paso**" o "**1.** paso").
      return line
        .replace(/^(\s*)\*\*\s*(\d+)\s*[.)]\s*(.*?)\s*\*\*\s*$/, (m, s, n, t) => (t ? `${s}${n}. **${t}**` : `${s}${n}. `))
        .replace(/^(\s*)\*\*\s*(\d+)\s*[.)]?\s*\*\*\s*/, (m, s, n) => `${s}${n}. `);
    })
    .join("\n");
}

function parseBlocks(src, depth = 0) {
  const lines = typeof src === "string" ? src.split("\n") : src;
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Bloque de código. Si no se cierra (streaming), corre hasta el final.
    const f = FENCE_OPEN_RE.exec(line);
    if (f) {
      const ind = f[1].length;
      const mark = f[2];
      i += 1;
      const code = [];
      let open = true;
      while (i < lines.length) {
        const c = FENCE_OPEN_RE.exec(lines[i]);
        if (c && c[2][0] === mark[0] && c[2].length >= mark.length && !c[3]) {
          open = false;
          i += 1;
          break;
        }
        code.push(lines[i].replace(new RegExp(`^ {0,${ind}}`), ""));
        i += 1;
      }
      blocks.push({ type: "code", lang: f[3].replace(/^\{?\.?|\}$/g, ""), code: code.join("\n"), open });
      continue;
    }

    if (BLANK_RE.test(line)) {
      i += 1;
      continue;
    }

    const h = HEAD_RE.exec(line);
    if (h) {
      blocks.push({ type: "heading", level: h[1].length, text: h[2] });
      i += 1;
      continue;
    }

    if (HR_RE.test(line) && !(LIST_RE.test(line) && !/^\s*([-*_])(\s*\1){2,}\s*$/.test(line))) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const q = [];
      while (i < lines.length && !BLANK_RE.test(lines[i])) {
        if (QUOTE_RE.test(lines[i])) q.push(lines[i].replace(/^\s{0,3}>\s?/, ""));
        else if (startsBlock(lines, i)) break;
        else q.push(lines[i]); // continuación perezosa
        i += 1;
      }
      blocks.push({ type: "quote", blocks: depth < 8 ? parseBlocks(q, depth + 1) : [{ type: "p", text: q.join("\n") }] });
      continue;
    }

    if (isTableStart(lines, i)) {
      const head = splitRow(line);
      const align = splitRow(lines[i + 1]).map(alignOf);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && !BLANK_RE.test(lines[i])) {
        const r = splitRow(lines[i]);
        // Filas cortas se completan; las largas se recortan al encabezado.
        rows.push(head.map((_, j) => r[j] ?? ""));
        i += 1;
      }
      blocks.push({ type: "table", head, align, rows });
      continue;
    }

    const li = LIST_RE.exec(line);
    if (li) {
      const res = parseList(lines, i, depth);
      blocks.push(res.block);
      i = res.next;
      continue;
    }

    const para = [line.trim()];
    i += 1;
    while (i < lines.length && !BLANK_RE.test(lines[i]) && !startsBlock(lines, i)) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "p", text: para.join("\n") });
  }

  return blocks;
}

/**
 * Lista con anidación por sangría. Cada ítem junta sus renglones (sin la
 * sangría del contenido) y se vuelve a parsear como bloques, así una
 * sublista, un bloque de código o una cita dentro de un ítem salen bien.
 */
function parseList(lines, start, depth) {
  const first = LIST_RE.exec(lines[start]);
  const base = first[1].length;
  const ordered = /\d/.test(first[2]);
  const startNum = ordered ? parseInt(first[2], 10) : null;
  const items = [];
  let loose = false;
  let i = start;

  while (i < lines.length) {
    const m = LIST_RE.exec(lines[i]);
    if (!m || m[1].length < base || m[1].length > base + 1 || /\d/.test(m[2]) !== ordered) break;

    const contentCol = m[0].length && m[3] ? m[0].length : m[1].length + m[2].length + 1;
    const body = [lines[i].slice(m[0].length)];
    i += 1;
    let blankRun = 0;

    while (i < lines.length) {
      const l = lines[i];
      if (BLANK_RE.test(l)) {
        blankRun += 1;
        body.push("");
        i += 1;
        continue;
      }
      const ind = indentOf(l);
      const sub = LIST_RE.exec(l);
      if (ind >= base + 2 || (ind > base && !sub)) {
        // Contenido del ítem (sublista, código, párrafo indentado).
        body.push(l.slice(Math.min(ind, contentCol)));
        blankRun = 0;
        i += 1;
        continue;
      }
      if (blankRun === 0 && !sub && !startsBlock(lines, i)) {
        // Continuación perezosa del mismo párrafo.
        body.push(l.trim());
        i += 1;
        continue;
      }
      break;
    }

    // Los renglones en blanco al final no son del ítem; si sigue otro ítem
    // hermano después de un blanco, la lista es "suelta".
    while (body.length > 1 && body[body.length - 1] === "") {
      body.pop();
      if (i < lines.length) loose = true;
    }
    if (body.slice(1).some((l, j) => l === "" && body[j + 2] !== undefined && !/^\s/.test(body[j + 2]) && !LIST_RE.test(body[j + 2]))) {
      loose = true;
    }

    let text = body.join("\n");
    let task = null;
    const t = /^\[([ xX])\]\s+/.exec(text);
    if (t) {
      task = t[1] !== " ";
      text = text.slice(t[0].length);
    }
    items.push({ task, blocks: depth < 8 ? parseBlocks(text, depth + 1) : [{ type: "p", text }] });

    // Un ítem hermano tiene que estar en la misma columna.
    const nextM = i < lines.length ? LIST_RE.exec(lines[i]) : null;
    if (!nextM) break;
  }

  // Si el último "blanco" no tenía hermano detrás, la lista no es suelta.
  if (loose && i < lines.length) {
    const m = LIST_RE.exec(lines[i]);
    if (!m || m[1].length < base) loose = items.length > 1 && loose;
  }

  return { block: { type: ordered ? "ol" : "ul", start: startNum, items, loose: false && loose }, next: i };
}

/* -------------------------------------------------------- componentes */

function CodeBlock({ lang, code, open }) {
  const [state, setState] = useState("idle"); // idle | ok | error
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function handleCopy() {
    const ok = await copyText(code);
    setState(ok ? "ok" : "error");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1800);
  }

  const label = lang || "código";
  return (
    <figure className="md-code" data-open={open ? "" : undefined}>
      <figcaption className="md-code-head">
        <span className="md-code-lang">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={state === "idle" ? `Copiar el código${lang ? " " + lang : ""}` : undefined}
          data-state={state}
        >
          <Icon name={state === "ok" ? "check" : "copy"} size={14} />
          <span aria-live="polite">{state === "ok" ? "Copiado" : state === "error" ? "No se pudo copiar" : "Copiar"}</span>
        </button>
      </figcaption>
      <pre tabIndex={0} aria-label={`Bloque de código ${label}`}>
        <code className={lang ? "language-" + lang : undefined}>{code}</code>
      </pre>
    </figure>
  );
}

function MdTable({ head, align, rows, k }) {
  const st = (j) => (align[j] ? { textAlign: align[j] } : undefined);
  return (
    <div className="md-table" tabIndex={0} role="region" aria-label="Tabla">
      <table>
        <thead>
          <tr>
            {head.map((c, j) => (
              <th key={j} scope="col" style={st(j)}>
                {inline(c, `${k}h${j}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} style={st(j)}>
                  {inline(c, `${k}r${i}c${j}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListItem({ item, k }) {
  const [firstBlock, ...rest] = item.blocks;
  // En listas compactas el primer párrafo va suelto dentro del <li>.
  const lead = firstBlock?.type === "p" ? inlineLines(firstBlock.text, k + "p") : null;
  const others = lead ? rest : item.blocks;
  return (
    <li className={item.task !== null ? "md-task" : undefined}>
      {item.task !== null && (
        <input type="checkbox" checked={item.task} disabled aria-label={item.task ? "Hecho" : "Pendiente"} />
      )}
      {lead}
      {others.length > 0 && renderBlocks(others, k)}
    </li>
  );
}

function renderBlocks(blocks, kb = "b") {
  return blocks.map((b, i) => {
    const k = `${kb}-${i}`;
    switch (b.type) {
      case "p":
        return <p key={k}>{inlineLines(b.text, k)}</p>;
      case "heading": {
        // En una respuesta de chat, # y ## son subtítulos (h3); el resto, h4.
        const Tag = b.level <= 2 ? "h3" : "h4";
        return (
          <Tag key={k} className={b.level <= 2 ? "md-h md-h2" : "md-h"}>
            {inline(b.text, k)}
          </Tag>
        );
      }
      case "hr":
        return <hr key={k} className="md-hr" />;
      case "quote":
        return <blockquote key={k}>{renderBlocks(b.blocks, k)}</blockquote>;
      case "ul":
      case "ol": {
        const Tag = b.type;
        const hasTasks = b.items.some((it) => it.task !== null);
        return (
          <Tag
            key={k}
            start={b.type === "ol" && b.start !== 1 ? b.start : undefined}
            className={hasTasks ? "md-tasks" : undefined}
          >
            {b.items.map((it, j) => (
              <ListItem key={j} item={it} k={`${k}.${j}`} />
            ))}
          </Tag>
        );
      }
      case "code":
        return <CodeBlock key={k} lang={b.lang} code={b.code} open={b.open} />;
      case "table":
        return <MdTable key={k} k={k} head={b.head} align={b.align} rows={b.rows} />;
      default:
        return null;
    }
  });
}

/** Los modelos a veces cortan una lista con renglones en blanco o un párrafo
 *  suelto; listas del mismo tipo pegadas se unen en una sola. */
function mergeLists(blocks) {
  const merged = [];
  for (const b of blocks) {
    const prev = merged[merged.length - 1];
    if ((b.type === "ol" || b.type === "ul") && prev?.type === b.type) prev.items.push(...b.items);
    else merged.push(b);
  }
  return merged;
}

export function parseMarkdown(text) {
  return mergeLists(parseBlocks(normalize(text)));
}

export default function Md({ text = "", streaming = false }) {
  const blocks = useMemo(() => (text ? parseMarkdown(text) : []), [text]);
  if (!text) return null;

  return (
    <div className="md">
      {renderBlocks(blocks)}
      {streaming && <span className="stream-caret" aria-hidden="true" />}
    </div>
  );
}
