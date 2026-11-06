import React from "react";
import { Icon } from "../icons.jsx";
import { spotlight } from "../ui.jsx";

const PRESETS = [
  { i: "doc", name: "Escritor", d: "Te ayuda a redactar y pulir textos." },
  { i: "bot", name: "Programador", d: "Escribe y revisa código con vos." },
  { i: "wand", name: "Lluvia de ideas", d: "Genera opciones sin freno." },
  { i: "knot", name: "Resumidor", d: "Convierte texto largo en puntos clave." },
];

export default function Agentes({ go, auth }) {
  const habilitado = auth && (auth.plan === "pro" || auth.plan === "plus");

  return (
    <section>
      <p className="eyebrow">04 · HERRAMIENTAS</p>
      <h1 className="hero">Mini agentes</h1>
      <p className="lede">Asistentes pequeños, enfocados en una tarea concreta.</p>

      {habilitado ? (
        <>
          <div className="grid-cards" style={{ marginTop: 34 }}>
            {PRESETS.map((a) => (
              <button
                key={a.name}
                className="card spot"
                onPointerMove={spotlight.onPointerMove}
                onClick={() => go("chat")}
              >
                <span className="sq"><Icon name={a.i} size={17} /></span>
                <span className="t">
                  <strong>{a.name}</strong>
                  <p>{a.d}</p>
                </span>
                <span className="card-arrow"><Icon name="arrowUpRight" size={15} /></span>
              </button>
            ))}
          </div>
          <p className="lede" style={{ marginTop: 18, fontSize: 13.5 }}>
            La configuración personalizada de agentes llega en la próxima versión.
          </p>
        </>
      ) : (
        <div className="lock-box spot" onPointerMove={spotlight.onPointerMove}>
          <span className="sq"><Icon name="lock" size={20} /></span>
          <h3>Creá tus propios mini agentes con Pro o Plus.</h3>
          <p>El plan Gratis permite usar los tres modelos con sus límites, pero no crear mini agentes personalizados.</p>

          <div className="lock-peek" aria-hidden="true">
            {PRESETS.map((a) => (
              <span key={a.name} className="lock-chip">
                <Icon name={a.i} size={13} /> {a.name}
              </span>
            ))}
            <span className="lock-chip">
              <Icon name="plusSq" size={13} /> El tuyo
            </span>
          </div>

          <div>
            <button className="btn btn-primary btn-sheen" onClick={() => go("planes")}>
              Ver planes <Icon name="arrowUpRight" size={13} />
            </button>
          </div>
          {!auth && (
            <p className="foot-note" style={{ margin: "14px 0 0" }}>
              ¿Ya tenés cuenta?{" "}
              <button className="linklike" onClick={() => go("login")}>
                Iniciá sesión
              </button>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
