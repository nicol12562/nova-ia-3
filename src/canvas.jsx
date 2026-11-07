import React from "react";
import { Icon } from "./icons.jsx";
import Md from "./md.jsx";
import { copyText, showToast } from "./ui.jsx";
import { piezaDe, nombreArchivo, wordCount } from "./piece.js";

// El "canvas" de Nova: cuando lo que pediste es una pieza —un texto, un
// presupuesto, código—, deja de ser una burbuja más del chat y se muestra sola,
// con copiar y descargar. No es un editor: la charla sigue mandando, el panel es
// el espejo limpio del entregable. La decisión de qué cuenta como pieza vive en piece.js,
// que es puro y se puede probar sin levantar React.

export { piezaDe };

export default function Canvas({ pieza, titulo, indice, total, vivo, onAnterior, onSiguiente, onCerrar }) {
  async function copiar() {
    const ok = await copyText(pieza.body);
    showToast(ok ? "Copiado. Ya lo podés pegar donde quieras." : "El navegador no dejó copiar.", ok ? {} : { tone: "error" });
  }

  function descargar() {
    const tipo = pieza.kind === "code" ? "text/plain;charset=utf-8" : "text/markdown;charset=utf-8";
    const url = URL.createObjectURL(new Blob([pieza.body], { type: tipo }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo(titulo, pieza);
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Sin esto la URL objeto queda viva hasta cerrar la pestaña.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const lineas = pieza.body.split("\n").length;

  return (
    <aside className="canvas-panel" aria-label="Pieza generada por Nova">
      <header className="cv-head">
        <div className="cv-title">
          <span className="cv-kicker">{pieza.kind === "code" ? "Código" : "Pieza"}</span>
          <strong title={titulo || ""}>{(titulo || "Sin título").slice(0, 54)}</strong>
        </div>
        <div className="cv-tools">
          {total > 1 && (
            <>
              <button className="icon-btn" onClick={onAnterior} aria-label="Pieza anterior" disabled={indice <= 0}>
                <Icon name="chevronDown" size={15} style={{ transform: "rotate(90deg)" }} />
              </button>
              <span className="cv-step">
                {indice + 1}/{total}
              </span>
              <button className="icon-btn" onClick={onSiguiente} aria-label="Pieza siguiente" disabled={indice >= total - 1}>
                <Icon name="chevronDown" size={15} style={{ transform: "rotate(-90deg)" }} />
              </button>
            </>
          )}
          <button className="icon-btn" onClick={onCerrar} aria-label="Cerrar el panel">
            <Icon name="x" size={16} />
          </button>
        </div>
      </header>

      <div className="cv-body">
        {pieza.kind === "code" ? (
          <pre className="cv-code">
            <code>{pieza.body}</code>
          </pre>
        ) : (
          <Md text={pieza.body} streaming={vivo} />
        )}
        {vivo && <span className="cv-live" aria-label="Nova está escribiendo">escribiendo…</span>}
      </div>

      <footer className="cv-foot">
        <span className="cv-meta">
          {pieza.kind === "code" ? `${lineas} líneas` : `${wordCount(pieza.body).length} palabras`}
        </span>
        <div className="cv-actions">
          <button className="btn btn-ghost btn-sm" onClick={descargar}>
            <Icon name="doc" size={13} /> Descargar
          </button>
          <button className="btn btn-primary btn-sm" onClick={copiar}>
            <Icon name="copy" size={13} /> Copiar
          </button>
        </div>
      </footer>
    </aside>
  );
}
