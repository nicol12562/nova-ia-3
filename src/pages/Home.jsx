import React, { useEffect, useState } from "react";
import { Icon } from "../icons.jsx";
import { AGENTS } from "../data/agents.js";
import { DRAFT_KEY } from "./Chat.jsx";

const fmt = (n) => Math.round(n || 0).toLocaleString("es-AR");

export default function Home({ go, auth }) {
  const [q, setQ] = useState("");
  const [modelos, setModelos] = useState([]);
  const [racha, setRacha] = useState(0);
  const [cuota, setCuota] = useState(null);
  const pago = !!auth && (auth.plan === "pro" || auth.plan === "plus");

  // Los techos los sirve el backend; así el Inicio no duplica números que pueden desactualizarse.
  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    fetch(`/api/usage?from=${hoy.slice(0, 8)}01&to=${hoy}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (Array.isArray(d.modelos)) setModelos(d.modelos);
        if (d.cuota) setCuota(d.cuota);
        setRacha(d.racha || 0);
      })
      .catch(() => {});
  }, []);

  const empezar = (texto) => {
    const contenido = (texto ?? q).trim();
    try {
      if (contenido) sessionStorage.setItem(DRAFT_KEY, contenido);
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* sin storage, entra al chat vacío */
    }
    go("chat");
  };

  const destacados = AGENTS.slice(0, 3);

  return (
    <section className="home">
      <div className="home-hero">
        <p className="eyebrow">Nova IA · Hecho en Argentina</p>
        <h1 className="hero hero-title">
          {auth && racha >= 2 ? `Otro día, ${racha} seguidos.` : "IA en español. Precios en pesos."}
        </h1>
        {auth && racha >= 2 && (
          <p className="home-racha">
            <Icon name="pulse" size={13} />
            Venís usando Nova {racha} días seguidos. La memoria hace que cada charla arranque más atrás.
          </p>
        )}
        <p className="lede">
          Un asistente para estudiar, programar, trabajar y crear. Responde en español rioplatense por
          defecto, te muestra el saldo que te queda y lo atiende una persona, no un formulario de soporte.
        </p>

        <form className="home-ask" onSubmit={(e) => { e.preventDefault(); empezar(); }}>
          <textarea
            rows={1}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                empezar();
              }
            }}
            placeholder="Pegá la duda, el enunciado o el mensaje del cliente…"
            aria-label="Escribí tu primera pregunta"
          />
          <button type="submit" className="btn btn-primary" disabled={!q.trim()}>
            <Icon name="send" size={15} /> Preguntar
          </button>
        </form>

        <div className="home-sug">
          {[
            "Respondé este mensaje de un cliente como si fueras el vendedor",
            "Explícame un tema difícil con un ejemplo de todos los días",
            "Revisá este código y decime dónde se rompe",
            "Armá un presupuesto corto con seña y envío",
          ].map((s) => (
            <button key={s} className="sug" onClick={() => empezar(s)}>{s}</button>
          ))}
        </div>

        {!auth && (
          <p className="home-note">
            <Icon name="lock" size={13} /> Probar no pide tarjeta: 3 mensajes por día sin cuenta. Crearla lleva un minuto.
          </p>
        )}
      </div>

      <div className="home-stats">
        <div><b>{cuota ? fmt(cuota) : "1.000.000"}</b><span>tokens por mes para empezar, sin tarjeta</span></div>
        <div><b>{modelos.length || 3}</b><span>modelos bajo una sola cuenta y un saldo visible</span></div>
        <div><b>{AGENTS.length}</b><span>mini agentes con instrucciones ya cargadas</span></div>
      </div>

      <h2 className="section-h2">Tres formas de responder</h2>
      <p className="section-sub">
        Flash para lo rápido y largo, Pro para texto y código, Pro 3.1 para lo difícil. Cada uno consume
        de su propia bolsa, y al lado del nombre está el proveedor que lo atiende hoy.
      </p>
      <div className="home-models">
        {modelos.map((m) => (
          <div key={m.key} className="hm-card">
            <div className="hm-top">
              <strong>{m.label}</strong>
              <span className="hm-pct">{m.pct}%</span>
            </div>
            <div className="plan-bar mini" aria-hidden="true"><span style={{ width: m.pct + "%" }} /></div>
            <div className="hm-nums">
              <b>{fmt(m.techo)}</b>
              <span>tokens/mes en Gratis</span>
            </div>
            <p className="hm-desc">{m.desc}</p>
            {m.upstream && <p className="hm-up" title="Proveedor que atiende este rol en el plan Gratis">{m.upstream}</p>}
          </div>
        ))}
      </div>

      <h2 className="section-h2">Mini agentes</h2>
      <p className="section-sub">
        {`${AGENTS.length} tareas concretas con las instrucciones ya cargadas —de responderle a un cliente por WhatsApp a revisar código—, sin que tengas que escribir el prompt. Se activan con Pro o Plus.`}
      </p>
      <div className="home-agents">
        {destacados.map((a) => (
          <button key={a.id} className="home-agent locked" onClick={() => go(pago ? "chat" : "planes")}>
            <span className="ico"><Icon name={pago ? a.icon : "lock"} size={16} /></span>
            <span className="t">
              <strong>{a.name}</strong>
              <p>{a.desc}</p>
            </span>
            <span className="go"><Icon name={pago ? "arrowUpRight" : "lock"} size={14} /></span>
          </button>
        ))}
        <button className="home-agent more" onClick={() => go("mini-agentes")}>
          <span className="ico"><Icon name="plusSq" size={16} /></span>
          <span className="t">
            <strong>Ver los {AGENTS.length}</strong>
            <p>{pago ? "Elegí uno y empezá." : "Compará planes para desbloquearlos."}</p>
          </span>
          <span className="go"><Icon name="arrowUpRight" size={14} /></span>
        </button>
      </div>

      <div className="home-links">
        <button onClick={() => go("planes")}>
          <Icon name="crown" size={16} /> Comparar planes
        </button>
        <button onClick={() => go("historial")}>
          <Icon name="clock" size={16} /> Mi historial
        </button>
        <button onClick={() => go("uso-tokens")}>
          <Icon name="pulse" size={16} /> Uso y tokens
        </button>
      </div>
    </section>
  );
}
