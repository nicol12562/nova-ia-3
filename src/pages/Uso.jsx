import React, { useEffect, useState } from "react";
import { Icon } from "../icons.jsx";
import { showToast, useCountUp } from "../ui.jsx";
import { COLOR_MODELO } from "./Home.jsx";

const fmt = (n) => Math.round(n || 0).toLocaleString("es-AR");
const diaEs = (iso) => (iso || "").slice(8, 10) + "/" + (iso || "").slice(5, 7);

export default function Uso({ auth, go }) {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today.slice(0, 8) + "01");
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const total = useCountUp(data?.total ?? 0);
  // La cuota la define el servidor según el plan real de la cuenta.
  const quota = data?.cuota ?? 0;
  const pct = data && quota ? Math.min(100, Math.round((data.total / quota) * 100)) : 0;

  async function consultar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/usage?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("respuesta inválida");
      setData(await res.json());
    } catch {
      setData(null);
      showToast("No pudimos consultar tu consumo. Probá de nuevo.", { tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  // El mes en curso se carga solo: es lo que casi siempre se quiere ver.
  useEffect(() => {
    if (auth?.id) consultar();
  }, [auth?.id]);

  const dias = data?.days || [];
  const maxDia = Math.max(1, ...dias.map((d) => (d.tokens_in || 0) + (d.tokens_out || 0)));

  return (
    <section className="page">
      <header className="page-head">
        <h1>Uso y tokens</h1>
        <p>Lo que registró el servidor, con lo que mandaste y lo que respondió Nova por separado.</p>
      </header>

      {!auth ? (
        <div className="empty">
          <Icon name="pulse" size={22} />
          <h2>Iniciá sesión para ver tu consumo</h2>
          <p>El contador es privado y está atado a tu cuenta.</p>
          <button className="btn btn-primary" onClick={() => go("login")}>Iniciar sesión</button>
        </div>
      ) : (
        <>
          <form className="periodo" onSubmit={(e) => { e.preventDefault(); consultar(); }}>
            <label>
              Desde
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </label>
            <button className="btn btn-quiet" disabled={loading || !from || !to}>
              {loading ? <><span className="spinner" /> Consultando…</> : "Ver ese período"}
            </button>
          </form>

          {data && (
            <>
              <div className="resumen">
                <div className="resumen-total">
                  <b>{total.toLocaleString("es-AR")}</b>
                  <span>tokens en el período, {pct}% de tu cuota mensual de {fmt(quota)}</span>
                  <span className="barra" aria-hidden="true"><i style={{ width: pct + "%" }} /></span>
                </div>
                <dl className="resumen-partes">
                  <div><dt>De tus mensajes</dt><dd>{fmt(data.totalIn)}</dd></div>
                  <div><dt>De las respuestas</dt><dd>{fmt(data.totalOut)}</dd></div>
                </dl>
              </div>

              {data.modelos?.length > 0 && (
                <section className="bloque" aria-labelledby="h-bolsas">
                  <h2 id="h-bolsas">Saldo por modelo en el plan {data.plan === "pro" ? "Pro" : data.plan === "plus" ? "Plus" : "Gratis"}</h2>
                  <ul className="bolsas">
                    {data.modelos.map((m) => (
                      <li key={m.key} className={"m-" + (COLOR_MODELO[m.key] || "oro") + (m.agotado ? " agotado" : "")}>
                        <div className="bolsa-top">
                          <strong><span className="dot" aria-hidden="true" />{m.label}</strong>
                          <span className="bolsa-nums">
                            {m.agotado ? "Agotado" : `${fmt(m.restantes ?? m.techo - m.usado)} de ${fmt(m.techo)}`}
                          </span>
                        </div>
                        <span className="barra" aria-hidden="true"><i style={{ width: Math.max(0, 100 - m.pct) + "%" }} /></span>
                        <p>{m.desc}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="bloque" aria-labelledby="h-dias">
                <h2 id="h-dias">Día por día</h2>
                {dias.length === 0 ? (
                  <p className="muted">No registramos consumo en ese período.</p>
                ) : (
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th scope="col">Día</th>
                        <th scope="col" className="num">Mensajes</th>
                        <th scope="col" className="num">Respuestas</th>
                        <th scope="col"><span className="sr-only">Proporción</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...dias].reverse().map((d) => {
                        const t = (d.tokens_in || 0) + (d.tokens_out || 0);
                        return (
                          <tr key={d.day}>
                            <td>{diaEs(d.day)}</td>
                            <td className="num">{fmt(d.tokens_in)}</td>
                            <td className="num">{fmt(d.tokens_out)}</td>
                            <td className="col-barra"><span className="barra" aria-hidden="true"><i style={{ width: (t / maxDia) * 100 + "%" }} /></span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}
        </>
      )}
    </section>
  );
}
