import React, { useState } from "react";
import { Icon } from "../icons.jsx";
import { AGENTS } from "../data/agents.js";

export const DRAFT_KEY = "novaia_draft";

export default function Home({ go, auth }) {
  const [q, setQ] = useState("");

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
        <p className="eyebrow"><Icon name="sparkle" size={14} /> Nova IA</p>
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
        <div><b>{AGENTS.length}</b><span>mini agentes con instrucciones listas</span></div>
        <div><b>3</b><span>modelos según tu plan</span></div>
      </div>

      <h2 className="section-h2">Mini agentes</h2>
      <p className="section-sub">Elegís uno y ya sabés cómo responde. Todos funcionan en cualquier plan.</p>
      <div className="home-agents">
        {destacados.map((a) => (
          <button key={a.id} className="home-agent" onClick={() => { empezar(a.sample); }}>
            <span className="ico"><Icon name={a.icon} size={16} /></span>
            <span className="t">
              <strong>{a.name}</strong>
              <p>{a.desc}</p>
            </span>
            <span className="go"><Icon name="arrowUpRight" size={14} /></span>
          </button>
        ))}
        <button className="home-agent more" onClick={() => go("mini-agentes")}>
          <span className="ico"><Icon name="plusSq" size={16} /></span>
          <span className="t">
            <strong>Ver los {AGENTS.length}</strong>
            <p>Todos los agentes disponibles.</p>
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
