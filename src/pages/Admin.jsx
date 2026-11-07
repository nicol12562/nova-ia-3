import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../icons.jsx";
import { showToast, spotlight, useCountUp } from "../ui.jsx";

const fmt = (n) => Math.round(n || 0).toLocaleString("es-AR");
const PLAN_LABEL = { gratis: "Gratis", plus: "Plus", pro: "Pro" };
const FILTROS = ["todos", "gratis", "plus", "pro"];

const ADMIN_STORE = "novaia_admin_key";
const readStoredKey = () => localStorage.getItem(ADMIN_STORE) || sessionStorage.getItem(ADMIN_STORE) || "";

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
  const [saving, setSaving] = useState(null);
  const [modelo, setModelo] = useState(null);
  const [opciones, setOpciones] = useState([]);
  const [modeloDraft, setModeloDraft] = useState("");
  const [guardandoModelo, setGuardandoModelo] = useState(false);
  const [health, setHealth] = useState(null);
  const [chequeando, setChequeando] = useState(false);

  // Estado real de los upstreams de OpenRouter. Un id que deja de existir no
  // tira un error claro en el chat: solo hace que Nova diga "no pude obtener
  // una respuesta", así que conviene verlo acá.
  async function revisarModelos(clave) {
    setChequeando(true);
    try {
      const r = await fetch("/api/admin/health", { headers: { "x-admin-key": clave } });
      if (r.ok) setHealth(await r.json());
      else setHealth({ ok: false, error: "El health check respondió " + r.status + "." });
    } catch {
      setHealth({ ok: false, error: "No se pudo contactar a OpenRouter." });
    } finally {
      setChequeando(false);
    }
  }

  async function cargar(clave, persist = recordar) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { headers: { "x-admin-key": clave } });
      if (res.status === 401) throw { msg: "La clave no es válida." };
      if (!res.ok) throw { msg: "El servidor respondió " + res.status + "." };
      setData(await res.json());
      setGate(true);
      sessionStorage.removeItem(ADMIN_STORE);
      localStorage.removeItem(ADMIN_STORE);
      (persist ? localStorage : sessionStorage).setItem(ADMIN_STORE, clave);
      setKey(clave);

      const mr = await fetch("/api/admin/model", { headers: { "x-admin-key": clave } });
      if (mr.ok) {
        const md = await mr.json();
        setModelo(md.model || null);
        setOpciones(md.opciones || []);
        setModeloDraft(md.model || "");
      }
      revisarModelos(clave); // no bloquea la lista: pinta cuando termina
    } catch (e) {
      setError(e.msg || "No se pudo cargar el listado.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function salir() {
    localStorage.removeItem(ADMIN_STORE);
    sessionStorage.removeItem(ADMIN_STORE);
    setKey("");
    setDraft("");
    setGate(false);
    setData(null);
    setError(null);
  }

  async function guardarModelo(nuevo) {
    setGuardandoModelo(true);
    try {
      const res = await fetch("/api/admin/model", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ model: nuevo }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "No se pudo guardar el modelo.");
      setModelo(out.model || null);
      setModeloDraft(out.model || "");
      showToast(out.model ? `Modelo global: ${out.model}` : "Volvió a la escalera por plan.");
    } catch (e) {
      showToast(e.message, { tone: "error" });
    } finally {
      setGuardandoModelo(false);
    }
  }

  async function cambiarPlan(usuario, planNuevo) {
    if (planNuevo === usuario.plan) return;
    setSaving(usuario.id);
    try {
      const res = await fetch("/api/admin/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ user_id: usuario.id, plan: planNuevo }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "No se pudo cambiar el plan.");
      const nuevo = { id: usuario.id, email: usuario.email, name: usuario.name, plan: planNuevo, role: usuario.role };

      // Si el cambio es sobre la cuenta que está logueada acá, se aplica al toque.
      if (auth && usuario.id === auth.id) {
        const nextAuth = { ...auth, plan: planNuevo };
        localStorage.setItem("novaia_user", JSON.stringify(nextAuth));
        setAuth(nextAuth);
      }
      avisarCambio(nuevo);

      setData((prev) => ({
        ...prev,
        usuarios: prev.usuarios.map((u) => (u.id === usuario.id ? { ...u, plan: planNuevo } : u)),
        resumen: {
          ...prev.resumen,
          porPlan: Object.fromEntries(
            ["gratis", "plus", "pro"].map((p) => [
              p,
              prev.usuarios.filter((u) => (u.id === usuario.id ? p === planNuevo : p === u.plan)).length,
            ])
          ),
        },
      }));
      showToast(`${usuario.email}: ${PLAN_LABEL[usuario.plan]} → ${PLAN_LABEL[planNuevo]}`);
    } catch (e) {
      showToast(e.message, { tone: "error" });
    } finally {
      setSaving(null);
    }
  }

  useEffect(() => {
    if (key) cargar(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibles = useMemo(() => {
    const list = data?.usuarios || [];
    const term = q.trim().toLowerCase();
    return list.filter(
      (u) =>
        (filtro === "todos" || u.plan === filtro) &&
        (!term || u.email.toLowerCase().includes(term) || (u.name || "").toLowerCase().includes(term))
    );
  }, [data, filtro, q]);

  const totalUsuarios = useCountUp(data?.resumen?.total ?? 0);
  const tokensMes = useCountUp(data?.resumen?.tokens_mes ?? 0);
  const mensajes = useCountUp(data?.resumen?.mensajes ?? 0);

  if (!gate) {
    return (
      <section>
        <div className="page-head">
          <div>
            <p className="eyebrow">07 · ADMINISTRACIÓN</p>
            <h1 className="hero">Panel de control</h1>
            <p className="lede">Acceso restringido. Necesitás la clave de administración.</p>
          </div>
        </div>
        <div className="admin-gate">
          <span className="ico"><Icon name="lock" size={20} /></span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              cargar(draft.trim());
            }}
          >
            <label className="mono-label" htmlFor="clave-admin">CLAVE DE ADMINISTRACIÓN</label>
            <input
              id="clave-admin"
              type="password"
              autoComplete="off"
              placeholder="La clave definida como secreto ADMIN_KEY"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            {error && <p className="admin-error">{error}</p>}
            <label className="admin-remember">
              <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
              Recordar en este navegador
            </label>
            <button className="btn btn-primary" disabled={loading}>
              {loading ? (<><span className="spinner" /> Verificando…</>) : ("Entrar al panel")}
            </button>
          </form>
          <p className="mono-note">
            {recordar
              ? "La clave queda guardada en este navegador: entrás directo las próximas veces."
              : "La clave se guarda solo mientras esta pestaña esté abierta."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">07 · ADMINISTRACIÓN</p>
          <h1 className="hero">Usuarios registrados</h1>
          <p className="lede">Planes, consumo de tokens y actividad, leído directo de la base.</p>
        </div>
        <div style={{ paddingTop: 26, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="chip-inline"
            onClick={() => {
              if (loading) return;
              cargar(key);
              showToast("Datos actualizados.");
            }}
          >
            <Icon name="pulse" size={13} /> Actualizar
          </button>
          <button className="chip-inline" onClick={salir} title="Olvidar la clave guardada en este navegador">
            <Icon name="logout" size={13} /> Olvidar clave
          </button>
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {data && (
        <>
          <div className="grid-cards">
            <div className="card static stat-card spot" onPointerMove={spotlight.onPointerMove}>
              <span className="t">
                <strong className="stat-num">{totalUsuarios.toLocaleString("es-AR")}</strong>
                <p>cuentas registradas</p>
              </span>
            </div>
            <div className="card static stat-card spot" onPointerMove={spotlight.onPointerMove}>
              <span className="t">
                <strong className="stat-num">{fmt(tokensMes)}</strong>
                <p>tokens consumidos este mes</p>
              </span>
            </div>
            <div className="card static stat-card spot" onPointerMove={spotlight.onPointerMove}>
              <span className="t">
                <strong className="stat-num">{fmt(mensajes)}</strong>
                <p>mensajes en la base</p>
              </span>
            </div>
            <div className="card static stat-card spot" onPointerMove={spotlight.onPointerMove}>
              <span className="t">
                <strong className="stat-num">
                  {data.resumen.activos_7dias}
                </strong>
                <p>de alta en los últimos 7 días</p>
              </span>
            </div>
          </div>

          <div className="model-card">
            <div className="mc-head">
              <span className="mono-label" style={{ marginBottom: 0 }}>MODELO GLOBAL</span>
              <span className={modelo ? "mc-state on" : "mc-state"}>
                {modelo ? "fijo" : "escalera por plan"}
              </span>
            </div>
            <p className="mc-note">
              {modelo
                ? "Todos los planes usan este modelo, sin importar la escalera de Gratis/Plus/Pro."
                : "Sin modelo fijo: cada plan usa su escalera y pasa al siguiente si uno falla."}
            </p>
            <div className="mc-row">
              <input
                value={modeloDraft}
                onChange={(e) => setModeloDraft(e.target.value)}
                placeholder="ej. openrouter/auto"
                aria-label="ID del modelo de OpenRouter"
              />
              <button
                className="btn btn-primary"
                disabled={guardandoModelo || modeloDraft.trim() === (modelo || "")}
                onClick={() => guardarModelo(modeloDraft.trim())}
              >
                {guardandoModelo ? (<><span className="spinner" /> Guardando…</>) : ("Aplicar")}
              </button>
              {modelo && (
                <button className="chip-inline" disabled={guardandoModelo} onClick={() => guardarModelo("")}>
                  Volver a la escalera
                </button>
              )}
            </div>
            <div className="mc-chips">
              {opciones.map((o) => (
                <button
                  key={o}
                  className={"filter-pill" + (modeloDraft === o ? " on" : "")}
                  onClick={() => setModeloDraft(o)}
                  disabled={guardandoModelo}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-health">
            <div className="ah-head">
              <strong>Estado de los modelos</strong>
              <button className="chip-inline" onClick={() => revisarModelos(key)} disabled={chequeando}>
                {chequeando ? "Revisando…" : "Revisar ahora"}
              </button>
            </div>
            {!health && !chequeando && <p className="ah-vacio">Todavía no se revisó OpenRouter.</p>}
            {health?.error && <p className="ah-malo">{health.error}</p>}
            {health?.items && (
              <>
                <p className={"ah-resumen " + (health.ok ? "ok" : "malo")}>
                  {health.totalUpstreams} upstreams ·{" "}
                  {health.ok ? "todos existen en el catálogo" : `${health.rotos.length} caído(s)`}
                </p>
                <ul className="ah-lista">
                  {health.items.map((it) => (
                    <li key={it.id} className={it.enCatalogo === "vivo" ? "ok" : it.enCatalogo === "no esta" ? "malo" : ""}>
                      <span className="ah-dot" aria-hidden="true" />
                      <code>{it.id}</code>
                      <em>{it.enCatalogo}{it.prueba ? ` · probe ${it.prueba}` : ""}</em>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="admin-toolbar">
            <div className="admin-filters" role="tablist" aria-label="Filtrar por plan">
              {FILTROS.map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filtro === f}
                  className={"filter-pill" + (filtro === f ? " on" : "")}
                  onClick={() => setFiltro(f)}
                >
                  {f === "todos" ? "Todos" : "Plan " + PLAN_LABEL[f]}
                  <b>{f === "todos" ? data.resumen.total : data.resumen.porPlan[f] || 0}</b>
                </button>
              ))}
            </div>
            <label className="admin-search">
              <Icon name="search" size={15} />
              <input
                placeholder="Buscar por email o nombre"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Buscar usuario"
              />
            </label>
          </div>

          <div className="table-wrap">
            <table className="comparison admin-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Cuenta</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Mes</th>
                  <th scope="col">Histórico</th>
                  <th scope="col">Chats</th>
                  <th scope="col">Alta</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((u, i) => (
                  <tr key={u.id}>
                    <td><span className="row-idx">U / {String(visibles.length - i).padStart(2, "0")}</span></td>
                    <td>
                      <div className="who">
                        <span className="avatar">{(u.name || u.email || "N")[0].toUpperCase()}</span>
                        <span className="t">
                          <strong>{u.name || u.email.split("@")[0]}</strong>
                          <span className="mono-sub">{u.email}</span>
                        </span>
                        {u.role === "admin" && <span className="chip-plan">admin</span>}
                      </div>
                    </td>
                    <td>
                      <label className="plan-select">
                        <select
                          value={u.plan}
                          disabled={saving === u.id}
                          onChange={(e) => cambiarPlan(u, e.target.value)}
                          aria-label={`Plan de ${u.email}`}
                        >
                          {["gratis", "plus", "pro"].map((p) => (
                            <option key={p} value={p}>{PLAN_LABEL[p]}</option>
                          ))}
                        </select>
                        {saving === u.id && <span className="spinner" />}
                      </label>
                    </td>
                    <td>
                      <div className="num">{fmt(u.mes)}</div>
                      <div className="plan-bar mini" aria-hidden="true"><span style={{ width: u.pct + "%" }} /></div>
                    </td>
                    <td>
                      <div className="num">{fmt(u.total)}</div>
                      <div className="mono-sub">↑{fmt(u.in)} · ↓{fmt(u.out)}</div>
                    </td>
                    <td>
                      <div className="num">{fmt(u.conversaciones)}</div>
                      <div className="mono-sub">{fmt(u.mensajes)} mensajes</div>
                    </td>
                    <td><span className="mono-sub">{(u.alta || "").slice(0, 10)}</span></td>
                  </tr>
                ))}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <p className="mono-sub" style={{ padding: "18px 4px", margin: 0 }}>
                        Ningún usuario coincide con el filtro.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!auth && (
            <p className="lede" style={{ marginTop: 22 }}>
              Estás viendo el panel sin sesión activa. <button className="linklike" onClick={() => go("login")}>Iniciar sesión</button>
            </p>
          )}
        </>
      )}

      {loading && !data && (
        <p className="lede" style={{ marginTop: 22 }}>Cargando…</p>
      )}
    </section>
  );
}
