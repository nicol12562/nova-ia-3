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

      {!pago && (
        <div className="agent-note">
          <p>
            <strong>Se habilitan con Plus o Pro.</strong> Con el plan Gratis usás los tres modelos;
            los agentes con instrucciones propias vienen al pasar de plan.
            {!auth && (
              <>
                {" "}¿Ya tenés uno?{" "}
                <button className="linklike" onClick={() => go("login")}>Iniciá sesión</button>.
              </>
            )}
          </p>
          <button className="btn btn-primary" onClick={() => go("planes")}>Ver planes</button>
        </div>
      )}

      <ul className="agentes">
        {AGENTS.map((a) => (
          <li key={a.id}>
            <button className="agente" onClick={() => abrir(a)}>
              <Icon name={a.icon} size={20} />
              <span className="agente-t">
                <strong>{a.name}</strong>
                <span>{a.desc}</span>
                <q>{a.sample}</q>
              </span>
              <span className={"agente-acc" + (pago ? "" : " bloqueado")}>
                {pago ? "Usar" : <><Icon name="lock" size={14} /> Plus o Pro</>}
              </span>
            </button>
          </li>
        ))}
      </ul>

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
