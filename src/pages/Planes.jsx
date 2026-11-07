import React, { useEffect, useState } from "react";
import { Icon } from "../icons.jsx";
import Md from "../md.jsx";
import { plans, comparison, notes } from "../data/plans.js";
import { AGENTS } from "../data/agents.js";
import { showToast, spotlight } from "../ui.jsx";

// Venta manual por WhatsApp. Formato internacional argentino: 54 + 9 + área + línea.
const WHATS = "5493416116096";

const fmt = (n) => Math.round(n || 0).toLocaleString("es-AR");
const MULT = (a, b) => (b > 0 ? Math.round((a / b) * 10) / 10 : 0);
const NOMBRE = { gratis: "Gratis", plus: "Plus", pro: "Pro" };

const whatsappLink = (p, email) => {
  const msg =
    `Hola, quiero contratar el plan ${p.name} de Nova IA (${p.price}).` +
    (email ? ` Mi cuenta: ${email}` : "") +
    ` (${p.tokensPerMonth} tokens/mes).`;
  return `https://wa.me/${WHATS}?text=${encodeURIComponent(msg)}`;
};

export default function Planes({ go, auth }) {
  const planIndex = auth?.plan === "pro" ? 3 : auth?.plan === "plus" ? 2 : 1;
  const [techos, setTechos] = useState(null);
  const [demo, setDemo] = useState({ tareas: [], restantes: 3, elegida: null, resultado: null, cargando: false, error: null });

  useEffect(() => {
    if (!auth?.id) return;
    fetch(`/api/demo`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !Array.isArray(d.tareas)) return;
        setDemo((prev) => ({ ...prev, tareas: d.tareas, restantes: d.restantes, elegida: prev.elegida || d.tareas[0].id }));
      })
      .catch(() => {});
  }, [auth?.id]);

  async function correrDemo() {
    if (!auth?.id || !demo.elegida) return;
    setDemo((d) => ({ ...d, cargando: true, error: null }));
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tarea: demo.elegida }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo correr la comparación.");
      setDemo((d) => ({ ...d, cargando: false, resultado: data, restantes: data.restantes }));
    } catch (e) {
      setDemo((d) => ({ ...d, cargando: false, error: e.message, resultado: null }));
      showToast(e.message, { tone: "error" });
    }
  }

  // Los números de la comparativa salen del catálogo del servidor, del mismo
  // lugar que ya alimenta el saldo del chat: así no se desincronizan.
  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    fetch(`/api/usage?from=${hoy.slice(0, 8)}01&to=${hoy}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.planes)) {
          setTechos({ planes: d.planes, modelos: d.modelos || [], forzado: !!d.forzado });
        }
      })
      .catch(() => {});
  }, []);

  const porPlan = Object.fromEntries((techos?.planes || []).map((p) => [p.plan, p]));

  return (
    <section>
      <p className="eyebrow">02 · PLANES Y MODELOS</p>
      <h1 className="hero">Elegí por uso, no por promesas.</h1>
      <p className="lede">
        Los tres planes atienden con los mismos modelos. Lo que cambia es cuánto los podés usar, qué
        tan larga sale cada respuesta y si tenés mini agentes. Todo en pesos, y se activa escribiendo
        al mismo WhatsApp que te responde después.
      </p>

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
                {auth?.plan === p.id && <span className="chip chip-plan">tu plan</span>}
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
              {p.extras
                // Con el modelo global forzado, "upstream propio" no es cierto:
                // los tres roles van al mismo proveedor. Se oculta en vez de mentir.
                .filter((e) => !(/upstream propio/i.test(e) && techos?.forzado))
                .map((e) => {
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
            {["gratis", "plus", "pro"].map((p) => {
              const datos = porPlan[p];
              if (!datos) return null;
              const base = porPlan.gratis;
              const destacados =
                p === "gratis"
                  ? [
                      { t: "Sin costo y sin tarjeta", d: `${fmt(datos.cuota)} tokens por mes para siempre, no sólo el primer mes.` },
                      {
                        t: "El saldo grande está en Flash",
                        d: `${fmt(datos.techos.flash)} tokens en el rol rápido: alcanza para leer, escribir y programar sin mirar el contador.`,
                      },
                      {
                        t: "Probá el rol de saldo más corto antes de pagar",
                        d: `Nova Pro 3.1 te deja unas ${Math.max(1, Math.round(datos.techos.pro31 / 900))} respuestas largas (estimado sobre 900 tokens por respuesta).`,
                      },
                    ]
                  : p === "plus"
                  ? [
                      {
                        t: `${MULT(datos.techos.pro, base.techos.pro)}× más Nova Pro`,
                        d: `${fmt(base.techos.pro)} → ${fmt(datos.techos.pro)} tokens por mes.`,
                      },
                      {
                        t: `${MULT(datos.techos.pro31, base.techos.pro31)}× más Nova Pro 3.1`,
                        d: `${fmt(base.techos.pro31)} → ${fmt(datos.techos.pro31)}. Es el cambio que más se nota en el mes.`,
                      },
                      { t: `Los ${AGENTS.length} mini agentes`, d: "Con las instrucciones ya cargadas, incluido el de clientes por WhatsApp." },
                    ]
                  : [
                      {
                        t: `${MULT(datos.techos.pro31, base.techos.pro31)}× más Nova Pro 3.1`,
                        d: `${fmt(base.techos.pro31)} → ${fmt(datos.techos.pro31)} tokens en el rol de saldo más corto.`,
                      },
                      {
                        t: `${MULT(datos.cuota, base.cuota)}× el cupón total`,
                        d: `${fmt(base.cuota)} → ${fmt(datos.cuota)} tokens por mes, repartidos entre los tres roles.`,
                      },
                      techos.forzado
                        ? { t: "Respuestas de hasta 8.192 tokens", d: "El doble de largo que Plus en una sola salida." }
                        : { t: "Upstream propio en Nova Pro 3.1", d: "Es el único plan donde ese rol cambia de proveedor. Además: respuestas de hasta 8.192 tokens." },
                    ];
              return (
                <div key={p} className={"edge-card" + (p === "pro" ? " featured" : "")}>
                  <div className="edge-head">
                    <strong>Plan {NOMBRE[p]}</strong>
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

          <div className="demo-box">
            <div className="demo-head">
              <div>
                <strong>Elegí una tarea y compará las tres respuestas</strong>
                <p>
                  Es el mismo prompt, corriendo en paralelo por Nova Flash, Nova Pro y Nova Pro 3.1.
                  No consume tu cupo del plan, pero sí gasta tokens reales: 3 pruebas por día.
                </p>
              </div>
              {auth && <span className="chip-inline">{demo.restantes ?? 3} de 3 disponibles hoy</span>}
            </div>

            <div className="demo-tasks" role="tablist" aria-label="Tipo de tarea">
              {(demo.tareas || []).map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={demo.elegida === t.id}
                  className={"filter-pill" + (demo.elegida === t.id ? " on" : "")}
                  onClick={() => setDemo((d) => ({ ...d, elegida: t.id }))}
                >
                  <Icon name={t.icon} size={13} /> {t.label}
                </button>
              ))}
            </div>

            {!auth ? (
              <div className="demo-cta">
                <span className="sq"><Icon name="lock" size={17} /></span>
                <p>Iniciá sesión para correr la comparación. Crear la cuenta toma un minuto.</p>
                <button className="btn btn-primary" onClick={() => go("login")}>
                  Iniciar sesión <Icon name="arrowUpRight" size={13} />
                </button>
              </div>
            ) : (
              <>
                <button
                  className="btn btn-ghost demo-run"
                  disabled={demo.cargando || !demo.elegida || (demo.restantes ?? 0) <= 0}
                  onClick={correrDemo}
                >
                  {demo.cargando ? (
                    <>
                      <span className="spinner" /> Corriendo los 3 modelos…
                    </>
                  ) : demo.resultado ? (
                    <>
                      <Icon name="pulse" size={14} /> Probar de nuevo
                    </>
                  ) : (
                    <>
                      <Icon name="wand" size={14} /> Correr la comparación
                    </>
                  )}
                </button>

                {demo.error && <p className="admin-error">{demo.error}</p>}

                {demo.resultado && (
                  <>
                    <p className="demo-criterio">
                      <Icon name="search" size={13} /> {demo.resultado.tarea.criterio}
                    </p>
                    <div className="demo-grid">
                      {demo.resultado.resultados.map((r) => (
                        <div key={r.key} className={"demo-col" + (r.ok ? "" : " fail")}>
                          <div className="dc-head">
                            <strong>{r.label}</strong>
                            <span className="dc-meta">
                              {r.ok ? `${(r.ms / 1000).toFixed(1)}s · ${fmt(r.tokens)} tok` : "falló"}
                            </span>
                          </div>
                          {r.ok ? (
                            <div className="dc-body"><Md text={r.texto} /></div>
                          ) : (
                            <p className="dc-error">{r.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
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
