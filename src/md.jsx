import React, { useState } from "react";
import { copyText } from "./ui.jsx";

/* ------------------------------------------------------------------
   Mini renderizador de markdown para las respuestas de Nova.
   Sin dependencias: soporta negrita, itálica, `código`, links,
   listas, títulos, citas, separadores, tablas simples y bloques de
   código con botón de copiado.
   ------------------------------------------------------------------ */

const INLINE_PATTERNS = [
  { re: /`([^`\n]+)`/, make: (m, k) => <code key={k} className="md-ic">{m[1]}</code> },
  {
    re: /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/,
    make: (m, k) => (
      <a key={k} href={m[2]} target="_blank" rel="noopener noreferrer">
        {m[1]}
      </a>
    ),
  },
  {
    re: /(https?:\/\/[^\s<>()[\]]+)/,
    make: (m, k) => (
      <a key={k} href={m[1]} target="_blank" rel="noopener noreferrer">
        {m[1]}
      </a>
    ),
  },
  { re: /\*\*([^*\n]+)\*\*/, make: (m, k) => <strong key={k}>{m[1]}</strong> },
  { re: /(?<![*\w])\*([^*\n]+)\*(?!\*)/, make: (m, k) => <em key={k}>{m[1]}</em> },
];

function inline(text, keyBase) {
  if (!text) return null;
  let best = null;
  for (const p of INLINE_PATTERNS) {
    const m = p.re.exec(text);
    if (m && (best === null || m.index < best.index)) best = { p, m, index: m.index };
  }
  if (!best) return text;
  const { p, m, index } = best;
  return [text.slice(0, index), p.make(m, keyBase), inline(text.slice(index + m[0].length), keyBase + "-x")];
}

const UL_RE = /^\s*[-*+]\s+/;
const OL_RE = /^\s*\d+[.)]\s+/;
const FENCE_RE = /^\s*```/;
const HEAD_RE = /^(#{1,6})\s+(.*)$/;
const HR_RE = /^\s*(---+|\*\*\*+|___+)\s*$/;
const QUOTE_RE = /^\s*>/;
const TABLE_SEP_RE = /^\s*\|?[\s:|-]+\|?[\s:|-]*$/;

function splitRow(row) {
  return row
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
}

function parseBlocks(src) {
  // Normalización: los modelos a veces mandan listas numeradas con el número
  // en negrita ("**1. paso**" o "**1.** paso"). Las convertimos a "1. paso"
  // conservando la negrita del texto para que el parser estándar las tome.
  src = String(src).replace(/\r\n/g, "\n");
  src = src
    .replace(/^\s*\*\*\s*(\d+)\s*[.)]?\s*\*\*\s*/gm, (m, n) => `${n}. `)
    .replace(/^\s*\*\*\s*(\d+)\s*[.)]\s*(.*?)\s*\*\*\s*$/gm, (m, n, t) => `${n}. **${t}**`);
  const lines = src.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (FENCE_RE.test(line)) {
      const lang = line.replace(/^\s*```/, "").trim().split(/\s+/)[0] || "";
      i += 1;
      const code = [];
      while (i < lines.length && !FENCE_RE.test(lines[i])) code.push(lines[i++]);
      i += 1; // cierre del fence (aunque no venga)
      blocks.push({ type: "code", lang, code: code.join("\n") });
      continue;
    }

    if (/^\s*$/.test(line)) {
      i += 1;
      continue;
    }

    const h = HEAD_RE.exec(line);
    if (h) {
      blocks.push({ type: "heading", level: h[1].length, text: h[2] });
      i += 1;
      continue;
    }

    if (HR_RE.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const q = [];
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        q.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: q.join("\n") });
      continue;
    }

    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      TABLE_SEP_RE.test(lines[i + 1]) &&
      lines[i + 1].includes("-")
    ) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && !/^\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", head, rows });
      continue;
    }

    if (UL_RE.test(line) || OL_RE.test(line)) {
      const ordered = OL_RE.test(line);
      const re = ordered ? OL_RE : UL_RE;
      const items = [];
      while (i < lines.length && re.test(lines[i])) {
        let item = lines[i].replace(re, "");
        while (
          i + 1 < lines.length &&
          !re.test(lines[i + 1]) &&
          !/^\s*$/.test(lines[i + 1]) &&
          !FENCE_RE.test(lines[i + 1]) &&
          !HEAD_RE.test(lines[i + 1]) &&
          !QUOTE_RE.test(lines[i + 1]) &&
          !HR_RE.test(lines[i + 1]) &&
          !(lines[i + 1].includes("|") && i + 2 < lines.length && TABLE_SEP_RE.test(lines[i + 2]))
        ) {
          i += 1;
          item += " " + lines[i].trim();
        }
        items.push(item);
        i += 1;
      }
      blocks.push({ type: ordered ? "ol" : "ul", items });
      continue;
    }

    const para = [line];
    i += 1;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !FENCE_RE.test(lines[i]) &&
      !HEAD_RE.test(lines[i]) &&
      !UL_RE.test(lines[i]) &&
      !OL_RE.test(lines[i]) &&
      !QUOTE_RE.test(lines[i]) &&
      !HR_RE.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1]))
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "p", text: para.join("\n") });
  }

  return blocks;
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="md-code">
      <div className="md-code-head">
        <span>{lang || "código"}</span>
        <button type="button" onClick={handleCopy}>
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MdTable({ head, rows }) {
  return (
    <div className="md-table">
      <table>
        <thead>
          <tr>
            {head.map((c, i) => (
              <th key={i}>{inline(c, "th" + i)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{inline(c, "td" + i + j)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Md({ text = "", streaming = false }) {
  if (!text) return null;
  let blocks = parseBlocks(text);

  // Los modelos a veces cortan la lista con renglones en blanco, dejando varios
  // <ol>/<ul> seguidos que se numeran desde 1 cada uno. Los unimos en uno solo.
  const merged = [];
  for (const b of blocks) {
    const prev = merged[merged.length - 1];
    if ((b.type === "ol" || b.type === "ul") && prev?.type === b.type) prev.items.push(...b.items);
    else merged.push(b);
  }
  blocks = merged;

  return (
    <div className="md">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return <p key={i}>{inline(b.text, "i" + i)}</p>;
          case "heading":
            return (
              <h3 key={i} className={b.level <= 2 ? "md-h md-h2" : "md-h"}>
                {inline(b.text, "h" + i)}
              </h3>
            );
          case "hr":
            return <hr key={i} className="md-hr" />;
          case "quote":
            return (
              <blockquote key={i}>
                {b.text.split("\n").map((l, j) => (
                  <span key={j}>
                    {inline(l, "q" + i + "_" + j)}
                    <br />
                  </span>
                ))}
              </blockquote>
            );
          case "ul":
            return (
              <ul key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, "u" + i + "_" + j)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, "o" + i + "_" + j)}</li>
                ))}
              </ol>
            );
          case "code":
            return <CodeBlock key={i} lang={b.lang} code={b.code} />;
          case "table":
            return <MdTable key={i} head={b.head} rows={b.rows} />;
          default:
            return null;
        }
      })}
      {streaming && <span className="stream-caret" aria-hidden="true" />}
    </div>
  );
}
