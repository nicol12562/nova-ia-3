import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icons.jsx";
import { showToast, useCountUp, useFocoAtrapado } from "../ui.jsx";

const fmt = (n) => Math.round(n || 0).toLocaleString("es-AR");
const PLAN_LABEL = { gratis: "Gratis", plus: "Plus", pro: "Pro" };
const FILTROS = ["todos", "gratis", "plus", "pro"];
const PLANES = ["gratis", "plus", "pro"];

const ADMIN_STORE = "novaia_admin_key";
const readStoredKey = () => localStorage.getItem(ADMIN_STORE) || sessionStorage.getItem(ADMIN_STORE) || "";

const COLUMNAS = [
  { k: "cuenta", t: "Cuenta", get: (u) => (u.name || u.email || "").toLowerCase() },
  { k: "plan", t: "Plan", get: (u) => PLANES.indexOf(u.plan) },
  { k: "mes", t: "Este mes", get: (u) => u.mes, num: true },
  { k: "total", t: "Histórico", get: (u) => u.total, num: true },
  { k: "chats", t: "Chats", get: (u) => u.conversaciones, num: true },
  { k: "alta", t: "Alta", get: (u) => u.alta || "" },
];

const valorDe = (kind, v) => (kind === "plan" ? PLAN_LABEL[v] || v || "—" : v || "escalera por plan");

function fecha(iso) {
  if (!iso) return null;
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

function cuando(iso) {
  const d = fecha(iso);
  if (!d) return "";
  const seg = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (seg < 60) return "recién";
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  if (seg < 172800) return "ayer";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

const fechaLarga = (iso) => {
  const d = fecha(iso);
  return d ? d.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "";
};

// Avisa a otras pestañas de que un plan cambió, para que se refleje sin recargar.
function avisarCambio(usuario) {
  try {
    const bc = new BroadcastChannel("novaia");
    bc.postMessage({ type: "plan", user: usuario });
    bc.close();
  } catch {
    /* navegadores sin BroadcastChannel: el polling de la app lo alcanza igual */
  }
}

async function pedir(path, clave, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "x-admin-key": clave,
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const out = await res.json().catch(() => ({}));
  return { res, out };
}

export default function Admin({ auth, setAuth, go }) {
  const [key, setKey] = useState(readStoredKey);
  const [gate, setGate] = useState(() => !!readStoredKey());
  const [draft, setDraft] = useState("");
  const [recordar, setRecordar] = useState(() => !!localStorage.getItem(ADMIN_STORE));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState({ col: "alta", dir: "desc" });
  const [modelo, setModelo] = useState(null);
  const [opciones, setOpciones] = useState([]);
  const [modeloDraft, setModeloDraft] = useState("");
  const [cola, setCola] = useState({ pendientes: [], registro: [] });
  const [vista, setVista] = useState("pendientes");
  const [proponiendo, setProponiendo] = useState(null);
  const [resolviendo, setResolviendo] = useState([]);
  const [confirmar, setConfirmar] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [health, setHealth] = useState(null);
  const [chequeando, setChequeando] = useState(false);
  const [, setTic] = useState(0);

  const cajaConfirm = useRef(null);
  const cajaDetalle = useRef(null);
  const keyRef = useRef(key);
  keyRef.current = key;
  const resolviendoRef = useRef(resolviendo);
  resolviendoRef.current = resolviendo;

  useFocoAtrapado(cajaConfirm, !!confirmar, () => setConfirmar(null));
  useFocoAtrapado(cajaDetalle, detalle != null, () => setDetalle(null));

  useEffect(() => {
    if (!confirmar && detalle == null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [confirmar, detalle]);

  // Estado real de los upstreams de OpenRouter. Un id que deja de existir no
  // tira un error claro en el chat: solo hace que Nova diga "no pude obtener
  // una respuesta", así que conviene verlo acá.
  async function revisarModelos(clave) {
    setChequeando(true);
    try {
      const { res, out } = await pedir("/api/admin/health", clave);
      setHealth(res.ok ? out : { ok: false, error: out.error || "El health check respondió " + res.status + "." });
    } catch {
      setHealth({ ok: false, error: "No se pudo contactar a OpenRouter." });
    } finally {
      setChequeando(false);
    }
  }

  async function cargarCola(clave) {
    const { res, out } = await pedir("/api/admin/changes", clave);
    if (res.ok) setCola({ pendientes: out.pendientes || [], registro: out.registro || [] });
    return res.ok ? out : null;
  }

  async function cargar(clave, persist = recordar) {
    setLoading(true);
    setError(null);
    try {
      const { res, out } = await pedir("/api/admin/users", clave);
      if (res.status === 401) throw new Error("La clave no es válida.");
      if (!res.ok) throw new Error(out.error || "El servidor respondió " + res.status + ".");
      setData(out);
      setGate(true);
      sessionStorage.removeItem(ADMIN_STORE);
      localStorage.removeItem(ADMIN_STORE);
      (persist ? localStorage : sessionStorage).setItem(ADMIN_STORE, clave);
      setKey(clave);

      const [mr, c] = await Promise.all([pedir("/api/admin/model", clave), cargarCola(clave)]);
      let actual = null;
      if (mr.res.ok) {
        actual = mr.out.model || null;
        setModelo(actual);
        setOpciones(mr.out.opciones || []);
      }
      const enCola = c?.pendientes?.find((x) => x.kind === "model");
      setModeloDraft(enCola ? enCola.after : actual || "");
      revisarModelos(clave); // no bloquea la lista: pinta cuando termina
    } catch (e) {
      setError(e.message || "No se pudo cargar el panel.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (key) cargar(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La cola es compartida: otra persona con la clave puede proponer mientras
  // esta pestaña está abierta. Se relee sola y de paso refresca los "hace 5 min".
  useEffect(() => {
    if (!gate) return;
    const t = setInterval(() => {
      setTic((n) => n + 1);
      if (document.visibilityState === "visible" && keyRef.current && !resolviendoRef.current.length) {
        cargarCola(keyRef.current);
      }
    }, 25000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate]);

  function salir() {
    localStorage.removeItem(ADMIN_STORE);
    sessionStorage.removeItem(ADMIN_STORE);
    setKey("");
    setDraft("");
    setGate(false);
    setData(null);
    setError(null);
    setCola({ pendientes: [], registro: [] });
    setDetalle(null);
    setConfirmar(null);
  }

  const pendienteDe = (userId) => cola.pendientes.find((c) => c.kind === "plan" && c.target === String(userId)) || null;
  const pendModelo = cola.pendientes.find((c) => c.kind === "model") || null;

  function ponerPendiente(cambio) {
    setCola((prev) => ({
      ...prev,
      pendientes: [cambio, ...prev.pendientes.filter((c) => !(c.kind === cambio.kind && c.target === cambio.target))],
    }));
  }

  function quitarPendiente(kind, target) {
    setCola((prev) => ({ ...prev, pendientes: prev.pendientes.filter((c) => !(c.kind === kind && c.target === target)) }));
  }

  // Editar ya no escribe en la base: deja la propuesta en la cola.
  async function proponer(kind, payload, etiqueta) {
    const { res, out } = await pedir(kind === "plan" ? "/api/admin/plan" : "/api/admin/model", key, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(out.error || "No se pudo dejar la propuesta.");
    if (out.sinCambio) {
      quitarPendiente(kind, kind === "plan" ? String(payload.user_id) : "global");
      showToast("Propuesta retirada: vuelve al valor actual.");
      return;
    }
    if (out.cambio) ponerPendiente(out.cambio);
    setVista("pendientes");
    showToast(`${etiqueta} quedó en la cola. Falta aprobarlo.`, { tone: "info" });
  }

  async function cambiarPlan(usuario, planNuevo) {
    const previa = pendienteDe(usuario.id);
    if (planNuevo === (previa ? previa.after : usuario.plan)) return;
    setProponiendo("plan:" + usuario.id);
    // Optimista: la fila muestra la propuesta al toque y el servidor la confirma.
    ponerPendiente({
      id: previa?.id ?? -usuario.id,
      kind: "plan",
      target: String(usuario.id),
      label: usuario.email,
      before: usuario.plan,
      after: planNuevo,
      status: "pending",
      creado: new Date().toISOString(),
      local: true,
    });
    try {
      await proponer("plan", { user_id: usuario.id, plan: planNuevo }, `Plan de ${usuario.email}`);
    } catch (e) {
      if (previa) ponerPendiente(previa);
      else quitarPendiente("plan", String(usuario.id));
      showToast(e.message, { tone: "error" });
    } finally {
      setProponiendo(null);
    }
  }

  async function cambiarModelo(nuevo) {
    setProponiendo("model");
    try {
      await proponer("model", { model: nuevo }, nuevo ? `Modelo ${nuevo}` : "Volver a la escalera");
    } catch (e) {
      showToast(e.message, { tone: "error" });
    } finally {
      setProponiendo(null);
    }
  }

  // El único gesto que escribe de verdad. El servidor vuelve a leer el valor
  // actual antes de aplicarlo, así que acá solo se refleja lo que respondió.
  async function resolver(ids, accion) {
    const lista = ids.filter((id) => id > 0);
    if (!lista.length) return;
    setConfirmar(null);
    setResolviendo(lista);
    const snapshot = cola;
    setCola((prev) => ({ ...prev, pendientes: prev.pendientes.filter((c) => !lista.includes(c.id)) }));

    try {
      const { out } = await pedir("/api/admin/changes", key, {
        method: "POST",
        body: JSON.stringify({ ids: lista, accion }),
      });
      if (!Array.isArray(out.resultados)) throw new Error(out.error || "No se pudo resolver el cambio.");

      setCola({ pendientes: out.pendientes || [], registro: out.registro || [] });

      const dePlan = out.resultados.filter((r) => r.usuario);
      if (dePlan.length) {
        setData((prev) => (prev ? conPlanes(prev, dePlan.map((r) => r.usuario)) : prev));
        for (const r of dePlan) {
          if (auth && r.usuario.id === auth.id) {
            const nextAuth = { ...auth, plan: r.usuario.plan };
            localStorage.setItem("novaia_user", JSON.stringify(nextAuth));
            setAuth(nextAuth);
          }
          avisarCambio(r.usuario);
        }
      }
      const deModelo = out.resultados.find((r) => r.status === "applied" && "model" in r);
      if (deModelo) {
        setModelo(deModelo.model || null);
        setModeloDraft(deModelo.model || "");
      }

      const malos = out.resultados.filter((r) => !r.ok);
      if (malos.length) {
        setVista("registro");
        showToast(malos[0].error || "Un cambio no se pudo aplicar.", { tone: "error", ms: 6000 });
      } else if (accion === "descartar") {
        showToast(lista.length > 1 ? `${lista.length} propuestas descartadas.` : "Propuesta descartada. Nada cambió.");
      } else if (lista.length > 1) {
        showToast(`${lista.length} cambios aplicados.`);
      } else if (deModelo) {
        showToast(`Modelo global: ${valorDe("model", deModelo.model)}. Aplicado.`);
      } else {
        const u = out.resultados[0]?.usuario;
        showToast(u ? `${u.email}: ${PLAN_LABEL[u.plan]}. Aplicado.` : "Cambio aplicado.");
      }
    } catch (e) {
      setCola(snapshot);
      showToast(e.message, { tone: "error" });
    } finally {
      setResolviendo([]);
    }
  }

  // Deshacer un cambio aplicado es proponer el inverso: vuelve a pasar por la
  // cola, no se saltea la aprobación.
  async function revertir(c) {
    setProponiendo("revert:" + c.id);
    try {
      if (c.kind === "plan") {
        await proponer("plan", { user_id: Number(c.target), plan: c.before }, `Volver a ${valorDe("plan", c.before)}`);
      } else {
        await proponer("model", { model: c.before }, "Volver al valor anterior");
      }
    } catch (e) {
      showToast(e.message, { tone: "error" });
    } finally {
      setProponiendo(null);
    }
  }

  const visibles = useMemo(() => {
    const list = data?.usuarios || [];
    const term = q.trim().toLowerCase();
    const col = COLUMNAS.find((c) => c.k === orden.col) || COLUMNAS[5];
    const filtrados = list.filter(
      (u) =>
        (filtro === "todos" || u.plan === filtro) &&
        (!term || u.email.toLowerCase().includes(term) || (u.name || "").toLowerCase().includes(term))
    );
    const dir = orden.dir === "asc" ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      const va = col.get(a);
      const vb = col.get(b);
      return va < vb ? -dir : va > vb ? dir : b.id - a.id;
    });
  }, [data, filtro, q, orden]);

  const totalUsuarios = useCountUp(data?.resumen?.total ?? 0);
  const tokensMes = useCountUp(data?.resumen?.tokens_mes ?? 0);
  const mensajes = useCountUp(data?.resumen?.mensajes ?? 0);

  const abiertos = cola.pendientes;
  const enConfirmacion = confirmar ? abiertos.filter((c) => confirmar.ids.includes(c.id)) : [];
  const cuentaAbierta = detalle != null ? (data?.usuarios || []).find((u) => u.id === detalle) || null : null;

  if (!gate) {
    return (
      <section className="adm">
        <div className="adm-head">
          <div>
            <h1>Mesa de control</h1>
            <p className="adm-lede">Acceso restringido. Necesitás la clave de administración.</p>
          </div>
        </div>
        <div className="adm-gate">
          <span className="adm-gate-ico"><Icon name="lock" size={20} /></span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              cargar(draft.trim());
            }}
          >
            <label className="adm-label" htmlFor="clave-admin">Clave de administración</label>
            <input
              id="clave-admin"
              type="password"
              autoComplete="off"
              placeholder="La clave definida como secreto ADMIN_KEY"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            {error && <p className="adm-error">{error}</p>}
            <label className="adm-check">
              <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
              Recordar en este navegador
            </label>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? (<><span className="spinner" /> Verificando…</>) : ("Entrar al panel")}
            </button>
          </form>
          <p className="adm-nota">
            {recordar
              ? "La clave queda guardada en este navegador: entrás directo las próximas veces."
              : "La clave se guarda solo mientras esta pestaña esté abierta."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="adm">
      <div className="adm-head">
        <div>
          <h1>Mesa de control</h1>
          <p className="adm-lede">Editar deja una propuesta. Nada toca la base hasta que se aprueba en la cola.</p>
        </div>
        <div className="adm-acc">
          <button
            className="adm-btn"
            disabled={loading}
            onClick={() => {
              cargar(key);
              showToast("Datos actualizados.");
            }}
          >
            <Icon name="pulse" size={14} /> Actualizar
          </button>
          <button className="adm-btn" onClick={salir} title="Olvidar la clave guardada en este navegador">
            <Icon name="logout" size={14} /> Olvidar clave
          </button>
        </div>
      </div>

      {error && <p className="adm-error">{error}</p>}
      {loading && !data && <p className="adm-lede">Cargando…</p>}

      {data && (
        <>
          <div className="adm-cifras">
            <div className="adm-cifra">
              <b>{totalUsuarios.toLocaleString("es-AR")}</b>
              <span>cuentas registradas</span>
            </div>
            <div className="adm-cifra">
              <b>{fmt(tokensMes)}</b>
              <span>tokens de {new Date().toLocaleDateString("es-AR", { month: "long" })}</span>
            </div>
            <div className="adm-cifra">
              <b>{fmt(mensajes)}</b>
              <span>mensajes guardados</span>
            </div>
            <div className="adm-cifra">
              <b>{data.resumen.activos_7dias}</b>
              <span>altas en 7 días</span>
            </div>
            <div className={"adm-cifra" + (abiertos.length ? " viva" : "")}>
              <b>{abiertos.length}</b>
              <span>esperando aprobación</span>
            </div>
          </div>

          <section className="adm-cola" aria-labelledby="titulo-cola">
            <div className="adm-cola-head">
              <h2 id="titulo-cola">Aprobaciones</h2>
              <div className="adm-tabs" role="tablist" aria-label="Ver la cola">
                <button
                  role="tab"
                  aria-selected={vista === "pendientes"}
                  className={"adm-tab" + (vista === "pendientes" ? " on" : "")}
                  onClick={() => setVista("pendientes")}
                >
                  Pendientes <b aria-live="polite">{abiertos.length}</b>
                </button>
                <button
                  role="tab"
                  aria-selected={vista === "registro"}
                  className={"adm-tab" + (vista === "registro" ? " on" : "")}
                  onClick={() => setVista("registro")}
                >
                  Registro <b>{cola.registro.length}</b>
                </button>
              </div>
              {vista === "pendientes" && abiertos.length > 1 && (
                <button
                  className="adm-btn claro"
                  disabled={!!resolviendo.length}
                  onClick={() =>
                    setConfirmar({ accion: "aprobar", ids: abiertos.filter((c) => !c.local).map((c) => c.id) })
                  }
                >
                  <Icon name="check" size={14} /> Aprobar las {abiertos.length}
                </button>
              )}
            </div>

            {vista === "pendientes" ? (
              abiertos.length ? (
                <ul className="adm-lista">
                  {abiertos.map((c) => (
                    <li key={c.kind + c.target} className={"adm-item" + (c.local ? " local" : "")}>
                      <span className="adm-tipo" aria-hidden="true">
                        <Icon name={c.kind === "plan" ? "crown" : "cpu"} size={15} />
                      </span>
                      <span className="adm-que">
                        <strong>{c.kind === "plan" ? c.label : "Modelo global de todos los planes"}</strong>
                        <span className="adm-diff">
                          <span className="antes">{valorDe(c.kind, c.before)}</span>
                          <span className="flecha" aria-hidden="true">→</span>
                          <span className="despues">{valorDe(c.kind, c.after)}</span>
                        </span>
                      </span>
                      <span className="adm-cuando" title={fechaLarga(c.creado)}>
                        {c.local ? "enviando…" : cuando(c.creado)}
                      </span>
                      <span className="adm-acciones">
                        <button
                          className="adm-btn"
                          disabled={c.local || resolviendo.includes(c.id)}
                          onClick={() => resolver([c.id], "descartar")}
                          aria-label={`Descartar el cambio de ${c.label}`}
                        >
                          Descartar
                        </button>
                        <button
                          className="adm-btn firme"
                          disabled={c.local || resolviendo.includes(c.id)}
                          onClick={() => setConfirmar({ accion: "aprobar", ids: [c.id] })}
                          aria-label={`Aprobar el cambio de ${c.label} a ${valorDe(c.kind, c.after)}`}
                        >
                          <Icon name="check" size={14} /> Aprobar
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="adm-vacio">
                  Nada esperando aprobación. Cambiá un plan o el modelo global y la propuesta aparece acá antes de
                  aplicarse.
                </p>
              )
            ) : cola.registro.length ? (
              <ul className="adm-lista registro">
                {cola.registro.map((c) => (
                  <li key={c.id} className={"adm-item estado-" + c.status}>
                    <span className="adm-sello">
                      {c.status === "applied" ? "Aplicado" : c.status === "rejected" ? "Descartado" : "Vencido"}
                    </span>
                    <span className="adm-que">
                      <strong>{c.kind === "plan" ? c.label : "Modelo global"}</strong>
                      <span className="adm-diff">
                        <span className="antes">{valorDe(c.kind, c.before)}</span>
                        <span className="flecha" aria-hidden="true">→</span>
                        <span className="despues">{valorDe(c.kind, c.after)}</span>
                      </span>
                      {c.detail && <span className="adm-detalle">{c.detail}</span>}
                    </span>
                    <span className="adm-cuando" title={`${fechaLarga(c.decidido)} · ${c.actor || ""}`}>
                      {cuando(c.decidido)}
                    </span>
                    <span className="adm-acciones">
                      {c.status === "applied" && (
                        <button
                          className="adm-btn"
                          disabled={proponiendo === "revert:" + c.id}
                          onClick={() => revertir(c)}
                          aria-label={`Proponer volver a ${valorDe(c.kind, c.before)} en ${c.label}`}
                        >
                          <Icon name="clock" size={14} /> Revertir
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-vacio">Todavía no se aprobó ni descartó nada.</p>
            )}
          </section>

          <div className="adm-dos">
            <section className="adm-bloque">
              <div className="adm-bloque-head">
                <h2>Modelo global</h2>
                <span className={"adm-estado" + (modelo ? " on" : "")}>{modelo ? "fijo" : "escalera por plan"}</span>
              </div>
              <p className="adm-nota">
                {modelo
                  ? "Todos los planes usan este modelo, sin importar la escalera de Gratis/Plus/Pro."
                  : "Sin modelo fijo: cada plan usa su escalera y pasa al siguiente si uno falla."}
              </p>
              {pendModelo && (
                <p className="adm-encola">
                  En la cola: <b>{valorDe("model", pendModelo.after)}</b>
                  <button
                    className="adm-link"
                    disabled={pendModelo.local}
                    onClick={() => setConfirmar({ accion: "aprobar", ids: [pendModelo.id] })}
                  >
                    aprobar ahora
                  </button>
                </p>
              )}
              <div className="adm-fila">
                <input
                  value={modeloDraft}
                  onChange={(e) => setModeloDraft(e.target.value)}
                  placeholder="ej. openrouter/auto"
                  aria-label="ID del modelo de OpenRouter"
                />
                <button
                  className="btn btn-primary"
                  disabled={
                    proponiendo === "model" || modeloDraft.trim() === (pendModelo ? pendModelo.after : modelo || "")
                  }
                  onClick={() => cambiarModelo(modeloDraft.trim())}
                >
                  {proponiendo === "model" ? (<><span className="spinner" /> Enviando…</>) : ("Proponer")}
                </button>
                {(modelo || pendModelo) && (
                  <button
                    className="adm-btn"
                    disabled={proponiendo === "model"}
                    onClick={() => {
                      setModeloDraft("");
                      cambiarModelo("");
                    }}
                  >
                    Volver a la escalera
                  </button>
                )}
              </div>
              <div className="adm-chips">
                {opciones.map((o) => (
                  <button
                    key={o}
                    className={"adm-chip" + (modeloDraft === o ? " on" : "")}
                    onClick={() => setModeloDraft(o)}
                    disabled={proponiendo === "model"}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </section>

            <section className="adm-bloque">
              <div className="adm-bloque-head">
                <h2>Estado de los modelos</h2>
                <button className="adm-btn" onClick={() => revisarModelos(key)} disabled={chequeando}>
                  {chequeando ? "Revisando…" : "Revisar ahora"}
                </button>
              </div>
              {health?.gratis && (
                <p className="adm-nota">
                  Cupo de modelos gratis: <b>{health.gratis.dia}</b>
                  {health.gratis.unlimited ? " · cuenta sin límite" : ""}
                </p>
              )}
              {health?.error && <p className="adm-error">{health.error}</p>}
              {health?.items && (
                <p className={"adm-resumen " + (health.ok ? "ok" : "malo")}>
                  {health.totalUpstreams} upstreams ·{" "}
                  {health.ok ? "todos existen en el catálogo" : `${health.rotos.length} caído(s)`}
                </p>
              )}
              {health?.breakers?.length > 0 && (
                <ul className="adm-planos fallos">
                  {health.breakers.map((b) => (
                    <li key={b.upstream} className="malo">
                      <code>{b.upstream}</code>
                      <span>
                        {b.quedanSeg}s de enfriamiento · {b.fails} fallo(s) · HTTP {String(b.status)}
                        {b.motivo ? ` · ${b.motivo}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {health?.items && (
                <ul className="adm-planos">
                  {health.items.map((it) => (
                    <li
                      key={it.id}
                      className={it.enCatalogo === "vivo" ? "ok" : it.enCatalogo === "no esta" ? "malo" : ""}
                    >
                      <code>{it.id}</code>
                      <span>{it.enCatalogo}{it.prueba ? ` · probe ${it.prueba}` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
              {!health && !chequeando && <p className="adm-vacio">Todavía no se revisó OpenRouter.</p>}
              {health && !health.items && !health.error && !health.breakers?.length && (
                <p className="adm-vacio">Ningún proveedor en enfriamiento ahora.</p>
              )}
            </section>
          </div>

          <section className="adm-bloque">
            <div className="adm-bloque-head">
              <h2>Cuentas</h2>
              <span className="adm-conteo">
                {visibles.length} de {data.resumen.total}
              </span>
            </div>

            <div className="adm-toolbar">
              <div className="adm-filtros" role="tablist" aria-label="Filtrar por plan">
                {FILTROS.map((f) => (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={filtro === f}
                    className={"adm-chip" + (filtro === f ? " on" : "")}
                    onClick={() => setFiltro(f)}
                  >
                    {f === "todos" ? "Todos" : PLAN_LABEL[f]}
                    <b>{f === "todos" ? data.resumen.total : data.resumen.porPlan[f] || 0}</b>
                  </button>
                ))}
              </div>
              <label className="adm-buscar">
                <Icon name="search" size={15} />
                <input
                  placeholder="Buscar por email o nombre"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Buscar usuario"
                />
                {q && (
                  <button className="adm-x" onClick={() => setQ("")} aria-label="Limpiar la búsqueda">
                    <Icon name="x" size={14} />
                  </button>
                )}
              </label>
            </div>

            <div className="adm-tabla-wrap">
              <table className="adm-tabla">
                <thead>
                  <tr>
                    {COLUMNAS.map((c) => (
                      <th
                        key={c.k}
                        scope="col"
                        className={c.num ? "num" : ""}
                        aria-sort={orden.col === c.k ? (orden.dir === "asc" ? "ascending" : "descending") : "none"}
                      >
                        <button
                          className="adm-orden"
                          onClick={() =>
                            setOrden((o) => ({ col: c.k, dir: o.col === c.k && o.dir === "desc" ? "asc" : "desc" }))
                          }
                        >
                          {c.t}
                          <Icon
                            name="chevronDown"
                            size={13}
                            style={{
                              opacity: orden.col === c.k ? 1 : 0.25,
                              transform: orden.col === c.k && orden.dir === "asc" ? "rotate(180deg)" : "none",
                            }}
                          />
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((u) => {
                    const pend = pendienteDe(u.id);
                    return (
                      <tr key={u.id} className={pend ? "con-propuesta" : ""}>
                        <td>
                          <button className="adm-quien" onClick={() => setDetalle(u.id)}>
                            <span className="avatar" aria-hidden="true">
                              {(u.name || u.email || "N")[0].toUpperCase()}
                            </span>
                            <span className="t">
                              <strong>{u.name || u.email.split("@")[0]}</strong>
                              <span className="adm-sub">{u.email}</span>
                            </span>
                            {u.role === "admin" && <span className="adm-rol">admin</span>}
                          </button>
                        </td>
                        <td>
                          <div className="adm-plan">
                            <select
                              value={pend ? pend.after : u.plan}
                              disabled={proponiendo === "plan:" + u.id}
                              onChange={(e) => cambiarPlan(u, e.target.value)}
                              aria-label={`Plan de ${u.email}`}
                            >
                              {PLANES.map((p) => (
                                <option key={p} value={p}>{PLAN_LABEL[p]}</option>
                              ))}
                            </select>
                            {proponiendo === "plan:" + u.id && <span className="spinner" />}
                          </div>
                          {pend && (
                            <button
                              className="adm-pend"
                              disabled={pend.local}
                              onClick={() => setConfirmar({ accion: "aprobar", ids: [pend.id] })}
                              title={`Propuesto ${valorDe("plan", pend.before)} → ${valorDe("plan", pend.after)}. Falta aprobar.`}
                            >
                              en cola · {PLAN_LABEL[pend.after]}
                            </button>
                          )}
                        </td>
                        <td className="num">
                          <div className="adm-num">{fmt(u.mes)}</div>
                          <div className="plan-bar mini" aria-hidden="true">
                            <span style={{ width: (u.pct || 0) + "%" }} />
                          </div>
                          <div className="adm-sub">{u.pct || 0}% de {fmt(u.limite)}</div>
                        </td>
                        <td className="num">
                          <div className="adm-num">{fmt(u.total)}</div>
                          <div className="adm-sub">↑{fmt(u.in)} · ↓{fmt(u.out)}</div>
                        </td>
                        <td className="num">
                          <div className="adm-num">{fmt(u.conversaciones)}</div>
                          <div className="adm-sub">{fmt(u.mensajes)} mensajes</div>
                        </td>
                        <td><span className="adm-sub">{(u.alta || "").slice(0, 10)}</span></td>
                      </tr>
                    );
                  })}
                  {visibles.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNAS.length}>
                        <p className="adm-vacio">Ningún usuario coincide con el filtro.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {!auth && (
            <p className="adm-nota">
              Estás viendo el panel sin sesión activa.{" "}
              <button className="adm-link" onClick={() => go("login")}>Iniciar sesión</button>
            </p>
          )}
        </>
      )}

      {confirmar && enConfirmacion.length > 0 && createPortal(
        <div className="adm-scrim" onMouseDown={(e) => e.target === e.currentTarget && setConfirmar(null)}>
          <div
            className="adm-dialogo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-confirm"
            tabIndex={-1}
            ref={cajaConfirm}
          >
            <h2 id="titulo-confirm">
              {enConfirmacion.length > 1 ? `Aprobar ${enConfirmacion.length} cambios` : "Aprobar el cambio"}
            </h2>
            <p className="adm-nota">Al aprobar se escribe en la base y la cuenta lo ve al toque.</p>
            <ul className="adm-confirm-lista">
              {enConfirmacion.map((c) => (
                <li key={c.id}>
                  <strong>{c.kind === "plan" ? c.label : "Modelo global"}</strong>
                  <span className="adm-diff">
                    <span className="antes">{valorDe(c.kind, c.before)}</span>
                    <span className="flecha" aria-hidden="true">→</span>
                    <span className="despues">{valorDe(c.kind, c.after)}</span>
                  </span>
                </li>
              ))}
            </ul>
            {enConfirmacion.some((c) => c.kind === "model") && (
              <p className="adm-aviso">El modelo global cambia el chat de todos los planes a la vez.</p>
            )}
            {enConfirmacion.some((c) => c.kind === "plan" && c.after !== "gratis") && (
              <p className="adm-aviso">El cobro se acuerda por WhatsApp: aprobar acá solo cambia el plan en la base.</p>
            )}
            <div className="adm-dialogo-acc">
              <button className="adm-btn" onClick={() => setConfirmar(null)}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={!!resolviendo.length}
                onClick={() => resolver(confirmar.ids, "aprobar")}
              >
                <Icon name="check" size={15} /> Aprobar y aplicar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {cuentaAbierta && createPortal(
        <div className="adm-scrim" onMouseDown={(e) => e.target === e.currentTarget && setDetalle(null)}>
          <aside
            className="adm-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Detalle de ${cuentaAbierta.email}`}
            tabIndex={-1}
            ref={cajaDetalle}
          >
            <button className="adm-x grande" onClick={() => setDetalle(null)} aria-label="Cerrar el detalle">
              <Icon name="x" size={18} />
            </button>
            <span className="avatar grande" aria-hidden="true">
              {(cuentaAbierta.name || cuentaAbierta.email)[0].toUpperCase()}
            </span>
            <h2>{cuentaAbierta.name || cuentaAbierta.email.split("@")[0]}</h2>
            <p className="adm-sub">{cuentaAbierta.email}</p>

            <dl className="adm-datos">
              <div>
                <dt>Plan</dt>
                <dd>{PLAN_LABEL[cuentaAbierta.plan]}{cuentaAbierta.role === "admin" ? " · admin" : ""}</dd>
              </div>
              <div><dt>Alta</dt><dd>{(cuentaAbierta.alta || "").slice(0, 10)}</dd></div>
              <div><dt>Este mes</dt><dd>{fmt(cuentaAbierta.mes)} de {fmt(cuentaAbierta.limite)}</dd></div>
              <div><dt>Histórico</dt><dd>{fmt(cuentaAbierta.total)}</dd></div>
              <div><dt>Entrada / salida</dt><dd>↑{fmt(cuentaAbierta.in)} · ↓{fmt(cuentaAbierta.out)}</dd></div>
              <div><dt>Conversaciones</dt><dd>{fmt(cuentaAbierta.conversaciones)}</dd></div>
              <div><dt>Mensajes</dt><dd>{fmt(cuentaAbierta.mensajes)}</dd></div>
            </dl>
            <div className="plan-bar" aria-hidden="true">
              <span style={{ width: (cuentaAbierta.pct || 0) + "%" }} />
            </div>

            <h3>Cambiar el plan</h3>
            <div className="adm-fila">
              <select
                value={pendienteDe(cuentaAbierta.id)?.after || cuentaAbierta.plan}
                disabled={proponiendo === "plan:" + cuentaAbierta.id}
                onChange={(e) => cambiarPlan(cuentaAbierta, e.target.value)}
                aria-label={`Plan de ${cuentaAbierta.email}`}
              >
                {PLANES.map((p) => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
              </select>
              {pendienteDe(cuentaAbierta.id) && (
                <button
                  className="btn btn-primary"
                  onClick={() => setConfirmar({ accion: "aprobar", ids: [pendienteDe(cuentaAbierta.id).id] })}
                >
                  Aprobar
                </button>
              )}
            </div>

            <h3>Historial de esta cuenta</h3>
            {cola.registro.some((c) => c.kind === "plan" && c.target === String(cuentaAbierta.id)) ? (
              <ul className="adm-planos">
                {cola.registro
                  .filter((c) => c.kind === "plan" && c.target === String(cuentaAbierta.id))
                  .map((c) => (
                    <li key={c.id} className={c.status === "applied" ? "ok" : c.status === "stale" ? "malo" : ""}>
                      <code>{valorDe("plan", c.before)} → {valorDe("plan", c.after)}</code>
                      <span>
                        {c.status === "applied" ? "aplicado" : c.status === "rejected" ? "descartado" : "vencido"} ·{" "}
                        {cuando(c.decidido)}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="adm-vacio">Sin cambios resueltos para esta cuenta.</p>
            )}
          </aside>
        </div>,
        document.body
      )}
    </section>
  );
}

// Recalcula el resumen con los planes nuevos para que los filtros no mientan
// hasta la próxima recarga.
function conPlanes(prev, usuarios) {
  const mapa = new Map(usuarios.map((u) => [u.id, u]));
  const lista = prev.usuarios.map((u) => (mapa.has(u.id) ? { ...u, plan: mapa.get(u.id).plan } : u));
  return {
    ...prev,
    usuarios: lista,
    resumen: {
      ...prev.resumen,
      porPlan: Object.fromEntries(PLANES.map((p) => [p, lista.filter((u) => u.plan === p).length])),
    },
  };
}
