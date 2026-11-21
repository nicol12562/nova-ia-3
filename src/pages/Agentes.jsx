import React, { useState } from "react";
import { Icon } from "../icons.jsx";
import { Modal } from "../ui.jsx";
import { AGENTS, AGENT_KEY } from "../data/agents.js";
import { plans } from "../data/plans.js";

// Precios desde el catálogo de planes, para no repetir cifras a mano.
const precio = (id) => plans.find((p) => p.id === id)?.price || "";

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

  const cerrarY = (ruta) => {
    setNeedPlan(null);
    go(ruta);
  };

  return (
    <section className="page">
      <header className="page-head">
        <h1>Mini agentes</h1>
        <p>
          {`${AGENTS.length} asistentes con instrucciones fijas para una tarea. Elegís uno, le pegás lo tuyo y te devuelve el resultado con el formato de esa tarea, sin que tengas que explicarle cómo.`}
          {pago && " Están todos habilitados en tu plan."}
        </p>
      </header>

      {!pago && (
        <div className="agent-note">
          <p>
            <strong>Vienen con Plus o Pro.</strong>{" "}
            {auth
              ? "Tu cuenta está en Gratis: seguís usando los tres modelos, pero los agentes se habilitan al pasar de plan."
              : "Sin cuenta o con el plan Gratis usás los tres modelos; los agentes se habilitan al pasar de plan."}{" "}
            Se pide por WhatsApp y se activa en el día.
            {!auth && (
              <>
                {" "}¿Ya tenés Plus o Pro?{" "}
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
            <button
              className="agente"
              onClick={() => abrir(a)}
              aria-haspopup={pago ? undefined : "dialog"}
            >
              <Icon name={a.icon} size={20} />
              <span className="agente-t">
                <strong>{a.name}</strong>
                <span>{a.desc}</span>
                {a.entrega && (
                  <span className="agente-dato">
                    <b>Te devuelve</b> {a.entrega}
                  </span>
                )}
                <q title={a.sample}>{a.sample}</q>
              </span>
              <span className={"agente-acc" + (pago ? "" : " bloqueado")}>
                {pago ? (
                  <>Usar <Icon name="arrowUpRight" size={14} /></>
                ) : (
                  <><Icon name="lock" size={14} /> Plus o Pro</>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Modal
        open={!!needPlan}
        onClose={() => setNeedPlan(null)}
        title={needPlan ? `${needPlan.name} viene con Plus o Pro` : ""}
        footer={
          <div className="modal-cta">
            <button className="btn btn-primary btn-block" onClick={() => cerrarY("planes")}>
              Ver planes y cómo pedirlo
            </button>
            {!auth && (
              <button className="btn btn-quiet btn-block" onClick={() => cerrarY("login")}>
                Ya tengo Plus o Pro: iniciar sesión
              </button>
            )}
          </div>
        }
      >
        {needPlan && (
          <>
            <p>{needPlan.desc}</p>
            <dl className="agente-ficha">
              {needPlan.pegas && (
                <div>
                  <dt>Le pasás</dt>
                  <dd>{needPlan.pegas}</dd>
                </div>
              )}
              {needPlan.entrega && (
                <div>
                  <dt>Te devuelve</dt>
                  <dd>{needPlan.entrega}</dd>
                </div>
              )}
            </dl>
            <ul className="check-list">
              <li>Los {AGENTS.length} agentes habilitados</li>
              <li>Más tokens por modelo cada mes</li>
              <li>Respuestas más largas</li>
            </ul>
            <p className="modal-note">
              Plus {precio("plus")} · Pro {precio("pro")}. Se pide por WhatsApp
              y una persona lo activa en el día.
            </p>
          </>
        )}
      </Modal>
    </section>
  );
}
