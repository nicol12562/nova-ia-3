import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../icons.jsx";
import { useCountUp } from "../ui.jsx";
import { COLOR_MODELO } from "./Home.jsx";

const fmt = (n) => Math.round(n || 0).toLocaleString("es-AR");
const PLAN_LABEL = { gratis: "Gratis", plus: "Plus", pro: "Pro" };

// Las fechas del servidor son días UTC (YYYY-MM-DD); se formatean en UTC para
// que un día no se corra al anterior por la zona horaria del navegador.
const aFecha = (iso) => new Date(iso + "T00:00:00Z");
const fmtDia = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
const fmtDiaLargo = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: "UTC" });
const fmtMes = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });

// Primer día del mes siguiente al de `iso`.
function renovacion(iso) {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1));
}

// Porcentaje legible: un consumo chico no se muestra como "0%".
function pctTexto(valor, max) {
  if (!max) return "0%";
  const p = (valor / max) * 100;
  if (valor > 0 && p < 1) return "menos del 1%";
  return Math.min(100, Math.round(p)).toLocaleString("es-AR") + "%";
}

// Barra con semántica de medidor: el lector de pantalla oye el valor en palabras.
function Medidor({ valor, max, etiqueta, texto, className = "" }) {
  const ancho = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0;
  return (
    <span
      className={"barra " + className}
      role="meter"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(valor, max)}
      aria-valuetext={texto}
    >
      <i style={{ width: ancho + "%" }} />
    </span>
  );
}

export default function Uso({ auth, go }) {
  const today = new Date().toISOString().slice(0, 10);
  const mesActual = today.slice(0, 7);
  const [from, setFrom] = useState(mesActual + "-01");
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [demo, setDemo] = useState(null);
  const pedido = useRef(0);

  const total = useCountUp(data?.total ?? 0);
  // La cuota la define el servidor según el plan real de la cuenta.
  const quota = data?.cuota ?? 0;
  // El período consultado (lo que muestra la página, aunque el usuario ya haya
  // cambiado las fechas sin volver a consultar).
  const [consultado, setConsultado] = useState({ from, to });
  const mesConsultado = consultado.from.slice(0, 7);
  const unSoloMes = mesConsultado === consultado.to.slice(0, 7);
  const esMesEnCurso = mesConsultado === mesActual;
  const periodoInvalido = !from || !to || from > to;

  async function consultar() {
    if (periodoInvalido) return;
    const id = ++pedido.current;
    const periodo = { from, to };
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/usage?from=${periodo.from}&to=${periodo.to}`);
      if (!res.ok) throw new Error("respuesta inválida");
      const json = await res.json();
      // Si el usuario pidió otro período mientras tanto, esta respuesta ya no vale.
      if (id !== pedido.current) return;
      setData(json);
      setConsultado(periodo);
    } catch {
      if (id === pedido.current) setError(true);
    } finally {
      if (id === pedido.current) setLoading(false);
    }
  }

  // El mes en curso se carga solo: es lo que casi siempre se quiere ver.
  useEffect(() => {
    if (auth?.id) consultar();
  }, [auth?.id]);

  // Pruebas de la demo comparativa que le quedan hoy. Si el endpoint no
  // responde, la fila no se muestra: no es parte del saldo.
  useEffect(() => {
    if (!auth?.id) return;
    let vivo = true;
    fetch("/api/demo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (vivo && d && typeof d.restantes === "number") setDemo(d);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [auth?.id]);

  const dias = data?.days || [];
  const maxDia = Math.max(1, ...dias.map((d) => (d.tokens_in || 0) + (d.tokens_out || 0)));
  const plan = PLAN_LABEL[data?.plan] || "Gratis";
  const renueva = renovacion(mesConsultado + "-01");
  const diasParaRenovar = Math.max(1, Math.ceil((renueva - aFecha(today)) / 86400000));
  const esPago = data?.plan === "plus" || data?.plan === "pro";

  return (
    <section className="page">
      <header className="page-head">
        <h1>Uso y tokens</h1>
        <p>Lo que registró el servidor, con lo que mandaste y lo que respondió Nova por separado.</p>
      </header>

      {!auth ? (
        <div className="empty">
          <Icon name="pulse" size={22} />
          <h2>Iniciá sesión para ver tu consumo</h2>
          <p>El contador es privado y está atado a tu cuenta.</p>
          <button className="btn btn-primary" onClick={() => go("login")}>Iniciar sesión</button>
        </div>
      ) : (
        <>
          <form className="periodo" onSubmit={(e) => { e.preventDefault(); consultar(); }}>
            <label>
              Desde
              <input type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
            </label>
            <button className="btn btn-quiet" disabled={loading || periodoInvalido}>
              {loading ? <><span className="spinner" aria-hidden="true" /> Consultando…</> : "Ver ese período"}
            </button>
            {from && to && from > to && (
              <p className="periodo-aviso" role="alert">La fecha de inicio tiene que ser anterior a la de fin.</p>
            )}
          </form>

          {error && (
            <div className="uso-error" role="alert">
              <p>
                <strong>No pudimos traer tu consumo.</strong>{" "}
                {data ? "Lo que ves abajo es la consulta anterior." : "Puede ser la conexión o el servidor."}
              </p>
              <button className="btn btn-quiet" onClick={consultar} disabled={loading}>Reintentar</button>
            </div>
          )}

          {!data && loading && (
            <div className="uso-cargando" aria-busy="true" aria-label="Cargando tu consumo">
              <div className="skeleton skeleton-total" aria-hidden="true" />
              <div className="skeleton-list" aria-hidden="true">
                <div className="skeleton" />
                <div className="skeleton" />
              </div>
            </div>
          )}

          {data && (
            <div className="uso-datos" aria-busy={loading} aria-live="polite">
              <div className="resumen">
                <div className="resumen-total">
                  <b>{total.toLocaleString("es-AR")}</b>
                  {unSoloMes ? (
                    <>
                      <span>
                        tokens en el período, {pctTexto(data.total, quota)} de tu cuota mensual de {fmt(quota)}
                      </span>
                      <Medidor
                        valor={data.total}
                        max={quota}
                        etiqueta="Cuota mensual usada"
                        texto={`${fmt(data.total)} de ${fmt(quota)} tokens, ${pctTexto(data.total, quota)}`}
                      />
                    </>
                  ) : (
                    <span>tokens en el período. La cuota es mensual: elegí fechas de un solo mes para verla.</span>
                  )}
                </div>
                <dl className="resumen-partes">
                  <div><dt>De tus mensajes</dt><dd>{fmt(data.totalIn)}</dd></div>
                  <div><dt>De las respuestas</dt><dd>{fmt(data.totalOut)}</dd></div>
                  <div><dt>Plan</dt><dd>{plan}</dd></div>
                </dl>
              </div>

              {data.modelos?.length > 0 && (
                <section className="bloque" aria-labelledby="h-bolsas">
                  <div className="bloque-head">
                    <h2 id="h-bolsas">
                      Saldo por modelo{esMesEnCurso ? "" : ` en ${fmtMes.format(aFecha(mesConsultado + "-01"))}`}
                    </h2>
                    <p className="bolsa-renueva">
                      {esMesEnCurso ? (
                        <>
                          <Icon name="clock" size={16} /> Se renueva el {fmtDiaLargo.format(renueva)}
                          {" "}({diasParaRenovar === 1 ? "falta 1 día" : `faltan ${diasParaRenovar} días`})
                        </>
                      ) : (
                        "Mes cerrado: es el saldo que quedó al terminar."
                      )}
                    </p>
                  </div>
                  <ul className="bolsas">
                    {data.modelos.map((m) => {
                      const restantes = m.restantes ?? Math.max(0, m.techo - m.usado);
                      const sinTecho = !m.techo;
                      return (
                        <li key={m.key} className={"m-" + (COLOR_MODELO[m.key] || "oro") + (m.agotado ? " agotado" : "")}>
                          <div className="bolsa-top">
                            <strong><span className="dot" aria-hidden="true" />{m.label}</strong>
                            <span className="bolsa-nums">
                              {sinTecho
                                ? "No incluido"
                                : m.agotado
                                  ? "Agotado"
                                  : `Quedan ${fmt(restantes)} de ${fmt(m.techo)}`}
                            </span>
                          </div>
                          <Medidor
                            valor={restantes}
                            max={m.techo || 0}
                            etiqueta={`Saldo de ${m.label}`}
                            texto={
                              sinTecho
                                ? "No incluido en tu plan"
                                : `Quedan ${fmt(restantes)} de ${fmt(m.techo)} tokens. Usaste ${fmt(m.usado)}.`
                            }
                          />
                          <p>
                            {m.agotado
                              ? esMesEnCurso
                                ? `Usaste todo el cupo. Vuelve el ${fmtDiaLargo.format(renueva)}; mientras, seguí con otro modelo.`
                                : "Ese mes se usó todo el cupo."
                              : m.desc}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {demo && (
                <section className="bloque uso-demo" aria-labelledby="h-demo">
                  <div>
                    <h2 id="h-demo">Demo comparativa</h2>
                    <p>
                      El mismo pedido, en los tres modelos a la vez. No descuenta de tu saldo.{" "}
                      {esPago
                        ? demo.restantes > 0
                          ? `Te quedan ${demo.restantes} de 3 pruebas hoy.`
                          : "Ya usaste las 3 pruebas de hoy; mañana tenés de nuevo."
                        : "Viene con los planes Plus y Pro."}
                    </p>
                  </div>
                  <button className="btn btn-quiet" onClick={() => go("planes")}>
                    {esPago && demo.restantes > 0 ? "Probar la demo" : "Ver planes"}
                  </button>
                </section>
              )}

              <section className="bloque" aria-labelledby="h-dias">
                <h2 id="h-dias">Día por día</h2>
                {dias.length === 0 ? (
                  <div className="uso-vacio">
                    <p>
                      No registramos consumo entre el {fmtDiaLargo.format(aFecha(consultado.from))} y el{" "}
                      {fmtDiaLargo.format(aFecha(consultado.to))}. Cuando charles con Nova, cada día aparece acá.
                    </p>
                    <button className="btn btn-quiet" onClick={() => go("chat")}>Abrir un chat</button>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="tabla">
                      <caption className="sr-only">Tokens por día, del más reciente al más viejo</caption>
                      <thead>
                        <tr>
                          <th scope="col">Día</th>
                          <th scope="col" className="num">Mensajes</th>
                          <th scope="col" className="num">Respuestas</th>
                          <th scope="col" className="num">Total</th>
                          <th scope="col"><span className="sr-only">Proporción</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...dias].reverse().map((d) => {
                          const t = (d.tokens_in || 0) + (d.tokens_out || 0);
                          return (
                            <tr key={d.day}>
                              <th scope="row"><time dateTime={d.day}>{fmtDia.format(aFecha(d.day))}</time></th>
                              <td className="num">{fmt(d.tokens_in)}</td>
                              <td className="num">{fmt(d.tokens_out)}</td>
                              <td className="num"><strong>{fmt(t)}</strong></td>
                              <td className="col-barra"><span className="barra" aria-hidden="true"><i style={{ width: (t / maxDia) * 100 + "%" }} /></span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </section>
  );
}
