import React from "react";
import { Icon } from "../icons.jsx";
import { AGENTS, AGENT_KEY } from "../data/agents.js";

export default function Agentes({ go, auth }) {
  const puedeCrear = auth && (auth.plan === "pro" || auth.plan === "plus");

  const abrir = (a) => {
    try {
      sessionStorage.setItem(AGENT_KEY, a.id);
    } catch {
      /* sin storage, entra al chat normal */
    }
    go("chat");
  };

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">04 · MINI AGENTES</p>
          <h1 className="hero">Mini agentes</h1>
          <p className="lede">
            Seis asistentes que ya vienen con las instrucciones cargadas. Elegís uno, escribís y listo.
          </p>
        </div>
        <div style={{ paddingTop: 26 }}>
          <span className="chip-inline">{AGENTS.length} disponibles</span>
        </div>
      </div>

      <div className="agents-grid">
        {AGENTS.map((a) => (
          <button key={a.id} className="agent-card" onClick={() => abrir(a)}>
            <span className="agent-ico"><Icon name={a.icon} size={18} /></span>
            <span className="agent-body">
              <strong>{a.name}</strong>
              <p>{a.desc}</p>
              <span className="agent-sample">
                <Icon name="send" size={12} /> {a.sample}
              </span>
            </span>
            <span className="agent-go"><Icon name="arrowUpRight" size={15} /></span>
          </button>
        ))}
      </div>

      <div className="agent-note">
        <span className="sq"><Icon name={puedeCrear ? "check" : "lock"} size={17} /></span>
        <div className="txt">
          <strong>{puedeCrear ? "Podés crear tus propios agentes" : "Crear agentes propios es de Pro o Plus"}</strong>
          <p>
            {puedeCrear
              ? "Definís las instrucciones, el nombre y el ejemplo. Todavía estamos terminando esa parte."
              : "Usar los seis que están acá es gratis para todos. Armar el tuyo con instrucciones propias pide plan pago."}
          </p>
        </div>
        {!puedeCrear && (
          <button className="btn btn-primary" onClick={() => go("planes")}>
            Ver planes <Icon name="arrowUpRight" size={13} />
          </button>
        )}
      </div>

      {!auth && (
        <p className="foot-note" style={{ marginTop: 16, textAlign: "center" }}>
          ¿Ya tenés cuenta?{" "}
          <button className="linklike" onClick={() => go("login")}>
            Iniciá sesión
          </button>{" "}
          para que el historial se guarde.
        </p>
      )}
    </section>
  );
}
