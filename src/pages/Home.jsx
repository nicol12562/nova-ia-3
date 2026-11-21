import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../icons.jsx";
import { AGENTS } from "../data/agents.js";
import { DRAFT_KEY } from "./Chat.jsx";
import Filete from "../filete.jsx";

const fmt = (n) => Math.round(n || 0).toLocaleString("es-AR");

// Cada rol tiene su color de filete; se repite en el chat y en Uso.
export const COLOR_MODELO = { flash: "oro", pro: "celeste", pro31: "verde" };

// Arranques concretos de los tres públicos reales: estudiar, vender, programar.
const ARRANQUES = [
  { t: "Contestale a un cliente", p: "Un cliente me escribió por WhatsApp: «hola, tenés la 42 en negro? cuánto sale con envío a Santa Fe?». Respondele corto y amable." },
  { t: "Explicame un tema", p: "Explicame qué es la oferta y la demanda como si tuviera 15 años, con un ejemplo argentino." },
  { t: "Revisá mi código", p: "Revisá este código y decime dónde falla:\n\n" },
  { t: "Armá un presupuesto", p: "Armá un presupuesto prolijo con seña del 50% y envío a cargo del cliente para: " },
];

export default function Home({ go, auth, racha = 0 }) {
  const [q, setQ] = useState("");
  const caja = useRef(null);
  const [modelos, setModelos] = useState([]);
  const [cuota, setCuota] = useState(null);
  const [forzado, setForzado] = useState(false);
  // "cargando" | "listo" | "error": sin esto, una falla dejaba "Cargando…" para siempre.
  const [estado, setEstado] = useState("cargando");
  const [intento, setIntento] = useState(0);
  const pago = !!auth && (auth.plan === "pro" || auth.plan === "plus");

  useEffect(() => {
    const t = caja.current;
    if (!t) return;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 220) + "px";
  }, [q]);

  // Los techos los sirve el backend; así el Inicio no duplica números que pueden desactualizarse.
  useEffect(() => {
    let vivo = true;
    setEstado("cargando");
    const hoy = new Date().toISOString().slice(0, 10);
    fetch(`/api/usage?from=${hoy.slice(0, 8)}01&to=${hoy}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo) return;
        if (!d || !Array.isArray(d.modelos) || !d.modelos.length) return setEstado("error");
        setModelos(d.modelos);
        if (d.cuota) setCuota(d.cuota);
        setForzado(!!d.forzado);
        setEstado("listo");
      })
      .catch(() => vivo && setEstado("error"));
    return () => { vivo = false; };
  }, [intento]);

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

  // Un arranque que termina en ":" o salto de línea pide que el usuario complete:
  // va al cuadro de texto en vez de mandarse solo.
  const usarArranque = (a) => {
    if (/[:\n]\s*$/.test(a.p)) {
      setQ(a.p);
      requestAnimationFrame(() => {
        const t = caja.current;
        if (!t) return;
        t.focus();
        t.setSelectionRange(t.value.length, t.value.length);
      });
    } else empezar(a.p);
  };

  const nombre = auth?.name ? auth.name.split(" ")[0] : null;

  return (
    <section className="home">
      <header className="home-hero">
        <Filete className="home-filete" />
        <h1 className="letrero">
          {nombre ? <>Hola, {nombre}.</> : <>Preguntá en criollo.</>}
        </h1>
        <p className="home-lede">
          {auth && racha >= 2
            ? `Van ${racha} días seguidos. Pegá la duda y seguimos.`
            : "Un asistente que responde en español rioplatense, cobra en pesos y te muestra cuánto saldo te queda en cada respuesta."}
        </p>
      </header>

      <form className="ask" onSubmit={(e) => { e.preventDefault(); empezar(); }}>
        <textarea
          ref={caja}
          rows={2}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (q.trim()) empezar();
            }
          }}
          placeholder="Pegá la duda, el enunciado o el mensaje del cliente"
          aria-label="Escribí tu primera pregunta"
        />
        <div className="ask-row">
          <span className={"ask-hint" + (auth ? "" : " ask-hint-invitado")}>
            {auth ? "Enter para mandar, Shift + Enter para otra línea" : "Sin cuenta: 3 mensajes por día, sin tarjeta"}
          </span>
          <button type="submit" className="btn btn-primary" disabled={!q.trim()}>
            Preguntar <Icon name="send" size={15} />
          </button>
        </div>
      </form>

      <ul className="arranques" aria-label="Ideas para arrancar">
        {ARRANQUES.map((a) => (
          <li key={a.t}>
            <button type="button" onClick={() => usarArranque(a)}>{a.t}</button>
          </li>
        ))}
      </ul>

      <section className="home-sec" aria-labelledby="h-modelos">
        <div className="sec-head">
          <h2 id="h-modelos">Tres modelos, tres saldos</h2>
          <p>
            {forzado
              ? "Ahora mismo un ajuste del panel manda los tres roles al mismo proveedor: cambia el saldo y el largo de la respuesta, no el modelo. Lo decimos acá en vez de esconderlo."
              : "Cada uno descuenta de su propia bolsa mensual. Abajo de cada nombre está quién lo atiende hoy."}
          </p>
        </div>
        <ul className="modelos" aria-busy={estado === "cargando"}>
          {modelos.map((m) => (
            <li key={m.key} className={"modelo m-" + (COLOR_MODELO[m.key] || "oro") + (auth && m.agotado ? " agotado" : "")}>
              <span className="modelo-nombre">{m.label}</span>
              <span className="modelo-desc">{m.desc}</span>
              <span className="modelo-cifra">
                {auth && m.agotado ? (
                  <>
                    <b>Agotado</b>
                    {`usaste los ${fmt(m.techo)} tokens de este mes`}
                  </>
                ) : (
                  <>
                    <b>{fmt(auth ? m.restantes : m.techo)}</b>
                    {auth ? `de ${fmt(m.techo)} tokens te quedan este mes` : "tokens por mes, gratis"}
                  </>
                )}
              </span>
              {m.upstream && <span className="modelo-up">{m.upstream}</span>}
            </li>
          ))}
          {!modelos.length && estado === "cargando" && (
            <li className="modelo modelo-cargando" role="status">Leyendo los saldos de cada modelo…</li>
          )}
          {!modelos.length && estado === "error" && (
            <li className="modelo modelo-cargando modelo-error" role="alert">
              <span>No pudimos leer los saldos, por la conexión o el servidor. Podés preguntar igual.</span>
              <button type="button" className="link" onClick={() => setIntento((n) => n + 1)}>
                Volver a intentar
              </button>
            </li>
          )}
        </ul>
      </section>

      <section className="home-sec" aria-labelledby="h-agentes">
        <div className="sec-head">
          <h2 id="h-agentes">Mini agentes</h2>
          <p>
            {`${AGENTS.length} tareas con las instrucciones ya cargadas, de contestarle a un cliente a revisar código. Vienen con Plus o Pro.`}
          </p>
        </div>
        <ul className="agentes-lista">
          {AGENTS.slice(0, 4).map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => go(pago ? "mini-agentes" : "planes")}>
                <Icon name={a.icon} size={17} />
                <span>
                  <strong>{a.name}</strong>
                  <small>{a.desc}</small>
                </span>
                {!pago && (
                  <>
                    <span className="sr-only">Viene con Plus o Pro: te llevo a los planes</span>
                    <Icon name="lock" size={14} />
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="link" onClick={() => go("mini-agentes")}>
          Ver los {AGENTS.length} agentes
        </button>
      </section>

      {!auth && (
        <aside className="home-cuenta">
          <div>
            <h2>Una cuenta gratis guarda todo</h2>
            <p>
              {`${cuota ? fmt(cuota) : "1.000.000"} tokens por mes, historial con búsqueda y una memoria que Nova lee en cada charla. Sin tarjeta.`}
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => go("login")}>Crear mi cuenta</button>
        </aside>
      )}
    </section>
  );
}
