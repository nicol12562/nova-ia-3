import React, { useEffect, useState } from "react";
import { Icon } from "../icons.jsx";
import { plans, comparison, notes } from "../data/plans.js";
import { showToast, spotlight } from "../ui.jsx";

// Venta manual por WhatsApp. Formato internacional argentino: 54 + 9 + área + línea.
const WHATS = "5493416116096";

const fmt = (n) => Math.round(n || 0).toLocaleString("es-AR");
const MULT = (a, b) => (b > 0 ? Math.round((a / b) * 10) / 10 : 0);
const NOMBRE = { gratis: "Gratis", pro: "Pro", plus: "Plus" };

const whatsappLink = (p, email) => {
  const msg =
    `Hola, quiero contratar el plan ${p.name} de Nova IA (${p.price}).` +
    (email ? ` Mi cuenta: ${email}` : "") +
    ` (${p.tokensPerMonth} tokens/mes).`;
  return `https://wa.me/${WHATS}?text=${encodeURIComponent(msg)}`;
};

export default function Planes({ go, auth }) {
  const planIndex = auth?.plan === "plus" ? 3 : auth?.plan === "pro" ? 2 : 1;
  const [techos, setTechos] = useState(null);

  // Los números de la comparativa salen del catálogo del servidor, del mismo
  // lugar que ya alimenta el saldo del chat: así no se desincronizan.
  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    fetch(`/api/usage?from=${hoy.slice(0, 8)}01&to=${hoy}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.planes)) {
          setTechos({ planes: d.planes, modelos: d.modelos || [] });
        }
      })
      .catch(() => {});
  }, []);

  const porPlan = Object.fromEntries((techos?.planes || []).map((p) => [p.plan, p]));
  const etiquetas = Object.fromEntries((techos?.modelos || []).map((m) => [m.key, m.label]));
  const claves = (techos?.modelos || []).map((m) => m.key);

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
                  <span className="check">✓</span>
                  <span className="modelo">{m}</span>
                  <span className="lim">{lim}</span>
                </li>
              ))}
              {p.extras.map((e) => {
                const negativo = /^sin /i.test(e);
                return (
                  <li key={e} className={negativo ? "no" : ""}>
                    <span className="check">{negativo ? "✕" : "✓"}</span>
                    <span className="modelo">{e}</span>
                  </li>
                );
              })}
            </ul>
            {p.id === "gratis" ? (
              <button className="btn btn-primary btn-block btn-sheen" onClick={() => go("chat")}>
                {p.cta}
              </button>
            ) : !auth ? (
              <button
                className="btn btn-primary btn-block"
                onClick={() => {
                  showToast("Iniciá sesión primero: así te identificamos al activarte el plan.");
                  go("login");
                }}
              >
                {p.cta}
              </button>
            ) : (
              <a
                className="btn btn-primary btn-block btn-whats"
                href={whatsappLink(p, auth.email)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="chat" size={16} /> {p.cta} por WhatsApp
              </a>
            )}
            <p className="foot-note">
              {p.id === "gratis" ? `Activación: ${p.activation}` : "Activación: por WhatsApp, en el día"}
            </p>
          </div>
        ))}
      </div>

      {techos && (
        <>
          <h2 className="section-h2">En qué se destaca cada uno</h2>
          <p className="section-sub">
            Los múltiplos están calculados sobre los techos reales que usa el backend, no sobre
            promedios. Multiplicamos contra el plan Gratis como referencia.
          </p>

          <div className="edge-grid">
            {["gratis", "pro", "plus"].map((p) => {
              const datos = porPlan[p];
              if (!datos) return null;
              const base = porPlan.gratis;
              const destacados =
                p === "gratis"
                  ? [
                      { t: "Sin costo fijo", d: `${fmt(datos.cuota)} tokens por mes y ninguna tarjeta.` },
                      {
                        t: "Nova Flash ilimitado en la práctica",
                        d: `Todo el cupón va al modelo rápido: ${fmt(datos.techos.flash)} tokens.`,
                      },
                      {
                        t: "Probalo antes de pagar",
                        d: `Alcanza para unas ${Math.max(1, Math.round(datos.techos.pro31 / 900))} respuestas largas con Nova Pro 3.1.`,
                      },
                    ]
                  : p === "pro"
                  ? [
                      {
                        t: `${MULT(datos.techos.pro, base.techos.pro)}× más Nova Pro`,
                        d: `${fmt(base.techos.pro)} → ${fmt(datos.techos.pro)} tokens por mes.`,
                      },
                      {
                        t: `${MULT(datos.techos.pro31, base.techos.pro31)}× más Nova Pro 3.1`,
                        d: `${fmt(base.techos.pro31)} → ${fmt(datos.techos.pro31)}. Es donde más se nota el salto.`,
                      },
                      { t: "Mini agentes habilitados", d: "Los 6 con instrucciones propias, y el tuyo." },
                    ]
                  : [
                      {
                        t: `${MULT(datos.techos.pro31, base.techos.pro31)}× más Nova Pro 3.1`,
                        d: `${fmt(base.techos.pro31)} → ${fmt(datos.techos.pro31)} tokens. El mejor modelo, sin tope real.` ,
                      },
                      {
                        t: `${MULT(datos.cuota, base.cuota)}× el cupón total`,
                        d: `${fmt(base.cuota)} → ${fmt(datos.cuota)} tokens por mes.`,
                      },
                      {
                        t: "Mejor modelo disponible",
                        d: "Nova Pro 3.1 apunta al upstream más capaz del catálogo.",
                      },
                    ];
              return (
                <div key={p} className={"edge-card" + (p === "pro" ? " featured" : "")}>
                  <div className="edge-head">
                    <strong>Plan {NOMBRE[p]}</strong>
                    {p === "pro" && <span className="chip chip-popular">El más elegido</span>}
                  </div>
                  <ul>
                    {destacados.map((x) => (
                      <li key={x.t}>
                        <span className="check">✓</span>
                        <span className="e-t">{x.t}</span>
                        <p>{x.d}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="table-wrap" style={{ marginTop: 22 }}>
            <table className="comparison">
              <thead>
                <tr>
                  <th scope="col">Quién gana en</th>
                  {["gratis", "pro", "plus"].map((p) => (
                    <th key={p} scope="col">{NOMBRE[p]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Cupón total del mes</strong></td>
                  {["gratis", "pro", "plus"].map((p) => {
                    const v = porPlan[p]?.cuota || 0;
                    const max = Math.max(...["gratis", "pro", "plus"].map((x) => porPlan[x]?.cuota || 0));
                    return <td key={p} className={v === max ? "col-current" : ""}>{fmt(v)}</td>;
                  })}
                </tr>
                {claves.map((k) => (
                  <tr key={k}>
                    <td><strong>{etiquetas[k]}</strong></td>
                    {["gratis", "pro", "plus"].map((p) => {
                      const v = porPlan[p]?.techos?.[k] || 0;
                      const max = Math.max(...["gratis", "pro", "plus"].map((x) => porPlan[x]?.techos?.[k] || 0));
                      return <td key={p} className={v === max ? "col-current" : ""}>{fmt(v)}</td>;
                    })}
                  </tr>
                ))}
                <tr>
                  <td><strong>Mini agentes propios</strong></td>
                  {["gratis", "pro", "plus"].map((p) => (
                    <td key={p} className={p !== "gratis" ? "col-current" : ""}>{p === "gratis" ? "No" : "Sí"}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

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
