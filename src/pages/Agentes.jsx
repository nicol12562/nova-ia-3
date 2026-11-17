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
    <section className="page">
      <header className="page-head">
        <h1>Mini agentes</h1>
        <p>
          {`${AGENTS.length} asistentes con las instrucciones ya cargadas. Escribís la pregunta y el agente se encarga del resto.`}
          {pago ? " Están todos habilitados en tu plan." : " Vienen con Plus y Pro."}
        </p>
      </header>

      <div className="agents-grid">
        {AGENTS.map((a) => (
          <button key={a.id} className={"agent-card" + (pago ? "" : " locked")} onClick={() => abrir(a)}>
            <span className="agent-ico"><Icon name={a.icon} size={19} /></span>
            <span className="agent-body">
              <strong>{a.name}</strong>
              <p>{a.desc}</p>
              <span className="agent-sample">“{a.sample}”</span>
            </span>
            <span className="agent-go">
              <Icon name={pago ? "arrowUpRight" : "lock"} size={15} />
            </span>
          </button>
        ))}
      </div>

      {!pago && (
        <div className="agent-note">
          <div className="txt">
            <strong>Los mini agentes vienen con Pro o Plus</strong>
            <p>
              El plan Gratis usa los tres modelos con sus límites. Los agentes con instrucciones propias
              se desbloquean al pasar de plan.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => go("planes")}>Ver planes</button>
        </div>
      )}


      {!auth && (
        <p className="foot-note">
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
        title={needPlan ? `${needPlan.name} es de plan pago` : ""}
        footer={
          <div className="modal-cta">
            <button
              className="btn btn-primary btn-block"
              onClick={() => { setNeedPlan(null); go("planes"); }}
            >
              Comparar planes
            </button>
            {!auth && (
              <button
                className="btn btn-quiet btn-block"
                onClick={() => { setNeedPlan(null); go("login"); }}
              >
                Ya tengo Pro, iniciar sesión
              </button>
            )}
          </div>
        }
      >
        <p>
          {needPlan?.desc} Se habilita con Plus o Pro.
        </p>
        <ul className="check-list">
          <li>Los {AGENTS.length} agentes habilitados</li>
          <li>Más tokens por modelo cada mes</li>
          <li>Respuestas más largas</li>
        </ul>
      </Modal>
    </section>
  );
}
