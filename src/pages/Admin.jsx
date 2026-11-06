import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../icons.jsx";
import { showToast, spotlight, useCountUp } from "../ui.jsx";

const fmt = (n) => Math.round(n || 0).toLocaleString("es-AR");
const PLAN_LABEL = { gratis: "Gratis", pro: "Pro", plus: "Plus" };
const FILTROS = ["todos", "gratis", "pro", "plus"];

export default function Admin({ auth, go }) {
  const [key, setKey] = useState(() => sessionStorage.getItem("novaia_admin_key") || "");
  const [gate, setGate] = useState(() => !!sessionStorage.getItem("novaia_admin_key"));
  const [draft, setDraft] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [q, setQ] = useState("");

  async function cargar(clave) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { headers: { "x-admin-key": clave } });
      if (res.status === 401) throw { msg: "La clave no es válida." };
      if (!res.ok) throw { msg: "El servidor respondió " + res.status + "." };
      setData(await res.json());
      setGate(true);
      sessionStorage.setItem("novaia_admin_key", clave);
      setKey(clave);
    } catch (e) {
      setError(e.msg || "No se pudo cargar el listado.");
      setData(null);
    } finally {
      setLoading(false);
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
            <button className="btn btn-primary" disabled={loading}>
              {loading ? (<><span className="spinner" /> Verificando…</>) : ("Entrar al panel")}
            </button>
          </form>
          <p className="mono-note">
            La clave se guarda solo en esta pestaña y se envía como cabecera en cada pedido.
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
        <div style={{ paddingTop: 26 }}>
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
                    <td><span className={"plan-tag p-" + u.plan}>{PLAN_LABEL[u.plan] || u.plan}</span></td>
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
