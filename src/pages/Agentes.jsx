import React, { useState } from "react";
import { Icon } from "../icons.jsx";
import { Modal } from "../ui.jsx";
import { AGENTS, AGENT_KEY } from "../data/agents.js";

export default function Agentes({ go, auth }) {
  const pago = !!auth && (auth.plan === "pro" || auth.plan === "plus");
  const [needPlan, setNeedPlan] = useState(null);

  const abrir = (a) => {
    if (!pago) {
      setNeedPlan(a);
      return;
    }
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
          <h1 className="hero">Mini agentes</h1>
          <p className="lede">
            {`${AGENTS.length} asistentes con las instrucciones ya cargadas. Escribí nomás la pregunta: el agente se encarga del resto.`}
          </p>
        </div>
        <div style={{ paddingTop: 26 }}>
          <span className={"chip-inline" + (pago ? " ok" : "")}>
            {pago ? "Desbloqueados" : "Pro y Plus"}
          </span>
        </div>
      </div>

      <div className="agents-grid">
        {AGENTS.map((a) => (
          <button key={a.id} className={"agent-card" + (pago ? "" : " locked")} onClick={() => abrir(a)}>
            <span className="agent-ico"><Icon name={a.icon} size={18} /></span>
            <span className="agent-body">
              <strong>{a.name}</strong>
              <p>{a.desc}</p>
              <span className="agent-sample">
                <Icon name="send" size={12} /> {a.sample}
              </span>
            </span>
            <span className="agent-go">
              <Icon name={pago ? "arrowUpRight" : "lock"} size={15} />
            </span>
          </button>
        ))}
      </div>

      {!pago && (
        <div className="agent-note">
          <span className="sq"><Icon name="lock" size={17} /></span>
          <div className="txt">
            <strong>Los mini agentes vienen con Pro o Plus</strong>
            <p>
              El plan Gratis usa los tres modelos con sus límites. Los agentes con instrucciones propias
              se desbloquean al pasar de plan.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => go("planes")}>
            Ver planes <Icon name="arrowUpRight" size={13} />
          </button>
        </div>
      )}

      {pago && (
        <div className="agent-note">
          <span className="sq"><Icon name="check" size={17} /></span>
          <div className="txt">
            <strong>Agentes disponibles en tu plan {auth.plan === "plus" ? "Plus" : "Pro"}</strong>
            <p>Elegí uno y escribí: las instrucciones se aplican solas en cada respuesta.</p>
          </div>
        </div>
      )}

      {!auth && (
        <p className="foot-note" style={{ marginTop: 16, textAlign: "center" }}>
          ¿Ya tenés Pro?{" "}
          <button className="linklike" onClick={() => go("login")}>
            Iniciá sesión
          </button>{" "}
          para usarlos.
        </p>
      )}

      <Modal
        open={!!needPlan}
        onClose={() => setNeedPlan(null)}
        eyebrow="MINI AGENTES"
        title={needPlan ? `${needPlan.name} es de plan pago` : ""}
        footer={
          <div className="gm-cta">
            <button
              className="btn btn-primary btn-block"
              onClick={() => { setNeedPlan(null); go("planes"); }}
            >
              <Icon name="crown" size={15} /> Comparar planes
            </button>
            {!auth && (
              <button
                className="btn btn-ghost btn-block"
                onClick={() => { setNeedPlan(null); go("login"); }}
              >
                Ya tengo Pro, iniciar sesión
              </button>
            )}
          </div>
        }
      >
        <p className="gm-copy">
          {needPlan?.desc} Con Pro o Plus lo usás sin límite de mensajes y con historial guardado.
        </p>
        <ul className="gm-list">
          <li><span className="tick"><Icon name="check" size={12} /></span> Los {AGENTS.length} agentes habilitados</li>
          <li><span className="tick"><Icon name="check" size={12} /></span> Más tokens por modelo cada mes</li>
          <li><span className="tick"><Icon name="check" size={12} /></span> Historial en cualquier dispositivo</li>
        </ul>
      </Modal>
    </section>
  );
}
