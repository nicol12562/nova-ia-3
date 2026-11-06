import React, { useEffect, useState } from "react";
import { Icon } from "../icons.jsx";
import { AGENTS } from "../data/agents.js";
import { DRAFT_KEY } from "./Chat.jsx";

const fmt = (n) => Math.round(n || 0).toLocaleString("es-AR");

export default function Home({ go, auth }) {
  const [q, setQ] = useState("");
  const [modelos, setModelos] = useState([]);
  const pago = !!auth && (auth.plan === "pro" || auth.plan === "plus");

  // Los techos los sirve el backend; así el Inicio no duplica números que pueden desactualizarse.
  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    fetch(`/api/usage?from=${hoy.slice(0, 8)}01&to=${hoy}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && Array.isArray(d.modelos) && setModelos(d.modelos))
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
        <p className="eyebrow">Nova IA</p>
        <h1 className="hero hero-title">Preguntá algo y empezá.</h1>
        <p className="lede">
          Escribí, aprendé, programá. Nova te responde en español, sin registro previo y con
          historial guardado cuando iniciás sesión.
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
            placeholder="¿En qué estás trabajando?"
            aria-label="Escribí tu primera pregunta"
          />
          <button type="submit" className="btn btn-primary" disabled={!q.trim()}>
            <Icon name="send" size={15} /> Preguntar
          </button>
        </form>

        <div className="home-sug">
          {["Explícame un tema difícil", "Escribí un mail breve", "Dame ideas para un proyecto"].map((s) => (
            <button key={s} className="sug" onClick={() => empezar(s)}>{s}</button>
          ))}
        </div>

        {!auth && (
          <p className="home-note">
            <Icon name="lock" size={13} /> Sin cuenta tenés 3 mensajes por día. Crearla toma un minuto.
          </p>
        )}
      </div>

      <div className="home-stats">
        <div><b>1.000.000</b><span>tokens gratis por mes</span></div>
        <div><b>3</b><span>modelos, cada uno con su propio saldo</span></div>
        <div><b>{AGENTS.length}</b><span>mini agentes en Pro y Plus</span></div>
      </div>

      <h2 className="section-h2">Cómo se reparte tu mes</h2>
      <p className="section-sub">
        Cada modelo consume de su propia bolsa. Usar Nova Pro 3.1 en el plan Gratis se agota rápido;
        Nova Flash te alcanza para mucho más.
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
          </div>
        ))}
      </div>

      <h2 className="section-h2">Mini agentes</h2>
      <p className="section-sub">
        Instrucciones ya cargadas para escritura, código, ideas y resúmenes. Vienen con Pro o Plus.
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
