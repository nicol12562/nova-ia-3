import React from "react";
import { Icon } from "../icons.jsx";
import { plans, comparison, notes } from "../data/plans.js";
import { showToast, spotlight } from "../ui.jsx";

export default function Planes({ go, auth }) {
  const planIndex = auth?.plan === "plus" ? 3 : auth?.plan === "pro" ? 2 : 1;

  return (
    <section>
      <p className="eyebrow">02 · PLANES Y MODELOS</p>
      <h1 className="hero">Elegí cómo usar Nova.</h1>
      <p className="lede">Elegí el plan según el uso que necesitás, con precios mensuales claros.</p>

      <div className="plans-grid">
        {plans.map((p) => (
          <div
            key={p.id}
            className={"plan-box spot" + (p.isCurrent ? " current" : "")}
            onPointerMove={spotlight.onPointerMove}
          >
            <div className="top">
              <span className="crown-lg"><Icon name="crown" size={21} /></span>
              <div className="chips">
                <span className="chip">{p.badge}</span>
                {p.id === "pro" && <span className="chip chip-popular">El más elegido</span>}
                {(p.isCurrent || auth?.plan === p.id) && <span className="chip chip-plan">tu plan</span>}
              </div>
            </div>
            <h2>{p.name}</h2>
            <p className="desc">{p.description}</p>
            <div className="price-big">{p.tokensPerMonth}</div>
            <p className="tokens-sub">tokens/mes</p>
            <hr />
            <div className="mi-title">Modelos incluidos</div>
            <ul>
              {p.models.map(([m, lim]) => (
                <li key={m}>
                  <span className="check">✓</span> {m} · {lim}
                </li>
              ))}
              {p.extras.map((e) => {
                const negativo = /^sin /i.test(e);
                return (
                  <li key={e} className={negativo ? "no" : ""}>
                    <span className="check" style={{ color: negativo ? "#b3453a" : undefined }}>
                      {negativo ? "✕" : "✓"}
                    </span>{" "}
                    {e}
                  </li>
                );
              })}
            </ul>
            <button
              className={"btn btn-primary btn-block" + (p.id === "gratis" ? " btn-sheen" : "")}
              onClick={() =>
                p.id === "gratis"
                  ? go("chat")
                  : showToast(
                      "Te contactamos para activar " + p.name + ". Próximamente: cobro automático con Mercado Pago."
                    )
              }
            >
              {p.cta}
            </button>
            <p className="foot-note">Activación: {p.activation}</p>
          </div>
        ))}
      </div>

      <h2 className="section-h2">Qué incluye cada plan</h2>
      <p className="section-sub">Compará las diferencias principales antes de elegir. Sin letra chica.</p>
      <div className="table-wrap">
        <table className="comparison">
          <thead>
            <tr>
              {comparison.headers.map((h, i) => (
                <th key={h} scope="col" className={i === planIndex ? "col-current" : ""}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((r) => (
              <tr key={r[0]}>
                <td><strong>{r[0]}</strong></td>
                {r.slice(1).map((c, i) => (
                  <td key={i} className={i + 1 === planIndex ? "col-current" : ""}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="notes">
        {notes.map((n, i) => (
          <p key={i} className="foot-note">{n}</p>
        ))}
      </div>
    </section>
  );
}
