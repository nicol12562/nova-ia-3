import React from "react";
import { Icon } from "../icons.jsx";
import { spotlight } from "../ui.jsx";

export default function Home({ go, auth }) {
  const cards = [
    { i: "chat", t: "Empezar un chat", d: "Preguntá, escribí, aprendé o programá.", r: "chat" },
    { i: "crown", t: "Explorar planes", d: "Compará los límites de Nova Flash y los modelos avanzados.", r: "planes" },
    { i: "clock", t: "Tu historial", d: "Volvé a conversaciones guardadas en tu cuenta.", r: "historial" },
    { i: "cpu", t: "Mini agentes", d: "Atajos para escritura, código e ideas.", r: "mini-agentes" },
  ];

  return (
    <section>
      <div className="hero-card spot" onPointerMove={spotlight.onPointerMove}>
        <div>
          <p className="eyebrow">
            <Icon name="sparkle" size={14} /> 01 · TU ESPACIO DE IA
          </p>
          <h1 className="hero hero-title">
            <span className="line">
              <span className="reveal-word" style={{ "--i": 0 }}>Las</span>{" "}
              <span className="reveal-word" style={{ "--i": 1 }}>ideas</span>
            </span>
            <span className="line">
              <span className="reveal-word" style={{ "--i": 2 }}>empiezan</span>
            </span>
            <span className="line hero-em">
              <span className="reveal-word" style={{ "--i": 3 }}>con</span>{" "}
              <span className="reveal-word" style={{ "--i": 4 }}>una</span>{" "}
              <span className="reveal-word" style={{ "--i": 5 }}>pregunta.</span>
            </span>
          </h1>
          <p className="lede">
            Escribí, aprendé, programá y convertí tus ideas en algo concreto con Nova.
          </p>
          <div className="hero-actions">
            <button className="btn btn-dark btn-sheen" onClick={() => go("chat")}>
              <Icon name="chat" size={16} /> Empezar a conversar <Icon name="arrowUpRight" size={14} />
            </button>
            {!auth && (
              <span className="note">
                <Icon name="lock" size={14} /> Iniciá sesión para guardar tus conversaciones.
              </span>
            )}
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="orbit" />
          <div className="orbit o2" />
          <div className="blob">
            <Icon name="sparkle" size={64} />
          </div>
          <div className="float-chip fc1"><Icon name="doc" size={19} /></div>
          <div className="float-chip fc2"><Icon name="bot" size={19} /></div>
        </div>
      </div>

      <h2 className="section-h2">¿Qué querés hacer hoy?</h2>
      <p className="section-sub">Entrá directo a lo que necesitás.</p>
      <div className="grid-cards">
        {cards.map((c) => (
          <button
            key={c.r}
            className="card spot"
            onPointerMove={spotlight.onPointerMove}
            onClick={() => go(c.r)}
          >
            <span className="sq"><Icon name={c.i} size={17} /></span>
            <span className="t">
              <strong>{c.t}</strong>
              <p>{c.d}</p>
            </span>
            <span className="card-arrow"><Icon name="arrowUpRight" size={15} /></span>
          </button>
        ))}
      </div>

      <div className="home-strip">
        <div>
          <b>3 modelos</b>
          <span>según tu plan, con límites claros</span>
        </div>
        <div>
          <b>1M tokens</b>
          <span>gratis por mes, sin tarjeta</span>
        </div>
        <div>
          <b>Historial</b>
          <span>tus conversaciones quedan en tu cuenta</span>
        </div>
      </div>
    </section>
  );
}
