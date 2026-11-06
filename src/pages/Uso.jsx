import React, { useState } from "react";
import { Icon } from "../icons.jsx";
import { showToast, spotlight, useCountUp } from "../ui.jsx";

const fmt = (n) => Math.round(n || 0).toLocaleString("es-AR");

export default function Uso({ auth, go }) {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today.slice(0, 8) + "01");
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [consultado, setConsultado] = useState(false);

  const total = useCountUp(data?.total ?? 0);
  const totalIn = useCountUp(data?.totalIn ?? 0);
  const totalOut = useCountUp(data?.totalOut ?? 0);
  // La cuota la define el servidor según el plan real de la cuenta.
  const quota = data?.cuota ?? 0;
  const pct = data && quota ? Math.min(100, Math.round((data.total / quota) * 100)) : 0;

  async function consultar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/usage?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("respuesta inválida");
      setData(await res.json());
      setConsultado(true);
    } catch {
      setData(null);
      setConsultado(true);
      showToast("No pudimos consultar tu consumo. Probá de nuevo.", { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">05 · TU CUENTA</p>
          <h1 className="hero">Uso y tokens</h1>
          <p className="lede">Consumo real registrado en el backend, con tokens de entrada y salida.</p>
        </div>
        <div style={{ paddingTop: 26 }}>
          <span className="chip-inline">Período seleccionable</span>
        </div>
      </div>

      {!auth ? (
        <div className="empty-state">
          <span className="sq"><Icon name="pulse" size={22} /></span>
          <h3>Iniciá sesión para ver tu consumo</h3>
          <p>El contador es privado y está vinculado a tu cuenta.</p>
          <button className="linklike" onClick={() => go("login")}>
            Iniciar sesión <Icon name="arrowUpRight" size={13} />
          </button>
        </div>
      ) : (
        <>
          <div className="uso-form">
            <div className="field-inline">
              <label htmlFor="desde">Desde</label>
              <input id="desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="field-inline">
              <label htmlFor="hasta">Hasta</label>
              <input id="hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <button className="btn btn-primary" disabled={loading || !from || !to} onClick={consultar}>
              {loading ? (
                <>
                  <span className="spinner" /> Consultando…
                </>
              ) : (
                "Consultar período"
              )}
            </button>
          </div>

          {consultado && data && (
            <>
              <div className="grid-cards" style={{ marginTop: 30 }}>
                <div className="card static stat-card spot" onPointerMove={spotlight.onPointerMove}>
                  <span className="t">
                    <strong className="stat-num">{total.toLocaleString("es-AR")}</strong>
                    <p>tokens totales en el período</p>
                  </span>
                </div>
                <div className="card static stat-card spot" onPointerMove={spotlight.onPointerMove}>
                  <span className="t">
                    <strong className="stat-num">{totalIn.toLocaleString("es-AR")}</strong>
                    <p>tokens de tus mensajes</p>
                  </span>
                </div>
                <div className="card static stat-card spot" onPointerMove={spotlight.onPointerMove}>
                  <span className="t">
                    <strong className="stat-num">{totalOut.toLocaleString("es-AR")}</strong>
                    <p>tokens de las respuestas</p>
                  </span>
                </div>
                <div className="card static stat-card spot" onPointerMove={spotlight.onPointerMove}>
                  <span className="t">
                    <strong className="stat-num">{pct}%</strong>
                    <p>de tu cuota mensual</p>
                    <div className="plan-bar" aria-hidden="true">
                      <span style={{ width: pct + "%" }} />
                    </div>
                  </span>
                </div>
              </div>

              {data.modelos?.length > 0 && (
                <div className="model-budgets">
                  <div className="mb-head">
                    <span className="mono-label" style={{ margin: 0 }}>SALDO POR MODELO · {data.plan.toUpperCase()}</span>
                    <span className="mono-sub">cada modelo consume su propia bolsa mensual</span>
                  </div>
                  {data.modelos.map((m) => (
                    <div key={m.key} className={"mb-row" + (m.agotado ? " out" : "")}>
                      <div className="mb-top">
                        <strong>{m.label}</strong>
                        <span className="mb-nums">
                          {fmt(m.usado)} / {fmt(m.techo)}
                          {m.agotado && <em>agotado</em>}
                        </span>
                      </div>
                      <div className="plan-bar mini" aria-hidden="true">
                        <span style={{ width: m.pct + "%" }} />
                      </div>
                      <p className="mb-desc">{m.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {data.days.length > 0 && (
                <div className="table-wrap" style={{ marginTop: 20 }}>
                  <table className="comparison">
                    <thead>
                      <tr>
                        <th scope="col">Día</th>
                        <th scope="col">Entrada</th>
                        <th scope="col">Salida</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.days.map((d) => (
                        <tr key={d.day}>
                          <td>{d.day}</td>
                          <td>{(d.tokens_in || 0).toLocaleString("es-AR")}</td>
                          <td>{(d.tokens_out || 0).toLocaleString("es-AR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {data.days.length === 0 && (
                <p className="lede" style={{ marginTop: 22 }}>
                  No registramos consumo en ese período.
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
