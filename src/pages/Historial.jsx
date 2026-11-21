import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../icons.jsx";
import { Modal, showToast } from "../ui.jsx";

// Cuánto espera un borrado antes de mandarse al servidor: el tiempo para
// arrepentirse con "Deshacer".
const DESHACER_MS = 6000;

// D1 guarda "YYYY-MM-DD HH:MM:SS" en UTC, sin zona.
function parseFecha(value) {
  if (!value) return null;
  const raw = String(value);
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inicioDelDia(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fmtCorto(d) {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(/[-.]/g, " ").trim();
}

function fmtHora(d) {
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

// Grupo de fecha de una conversación, relativo a hoy en la hora local.
function grupoDe(d, hoy) {
  if (!d) return { key: "sin-fecha", label: "Sin fecha" };
  const dias = Math.round((hoy - inicioDelDia(d)) / 86400000);
  if (dias <= 0) return { key: "hoy", label: "Hoy" };
  if (dias === 1) return { key: "ayer", label: "Ayer" };
  if (dias < 7) return { key: "semana", label: "Últimos 7 días" };
  if (dias < 30) return { key: "mes", label: "Últimos 30 días" };
  const mes = d.toLocaleDateString("es-AR", { month: "long" });
  const label = mes.charAt(0).toUpperCase() + mes.slice(1) + (d.getFullYear() !== hoy.getFullYear() ? ` de ${d.getFullYear()}` : "");
  return { key: `m-${d.getFullYear()}-${d.getMonth()}`, label };
}

function escaparRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Resalta el término buscado dentro de un texto, sin innerHTML.
function Resaltado({ texto, termino }) {
  const t = (termino || "").trim();
  if (!texto || t.length < 2) return texto || null;
  const partes = String(texto).split(new RegExp(`(${escaparRegex(t)})`, "gi"));
  return partes.map((p, i) =>
    p.toLowerCase() === t.toLowerCase() ? <mark key={i}>{p}</mark> : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

export default function Historial({ go, auth, racha = 0 }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // null | "red" | "sesion"
  const [buscados, setBuscados] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [pendientes, setPendientes] = useState([]); // [{ id, title }] esperando "Deshacer"
  const [confirmarTodo, setConfirmarTodo] = useState(false);
  const [borrandoTodo, setBorrandoTodo] = useState(false);

  const searchRef = useRef(null);
  const listaRef = useRef(null);
  const timerRef = useRef(null);
  const pendientesRef = useRef([]);
  pendientesRef.current = pendientes;

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/history`);
      if (res.status === 401) {
        setError("sesion");
        setItems([]);
      } else if (!res.ok) {
        setError("red");
      } else {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch {
      setError("red");
    } finally {
      setLoading(false);
    }
  }, [auth?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Búsqueda del servidor: encuentra texto DENTRO de los mensajes, no sólo en
  // el título. Mientras llega, se muestra el filtro local por título.
  useEffect(() => {
    const t = q.trim();
    if (!auth || t.length < 2) {
      setBuscados(null);
      setBuscando(false);
      return;
    }
    let vivo = true;
    setBuscando(true);
    const timer = setTimeout(() => {
      fetch(`/api/history?q=${encodeURIComponent(t)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (vivo) setBuscados(Array.isArray(d?.resultados) ? d.resultados : null);
        })
        .catch(() => {
          if (vivo) setBuscados(null);
        })
        .finally(() => {
          if (vivo) setBuscando(false);
        });
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [q, auth?.id]);

  // ---------------------------------------------------------- borrar + deshacer

  // Manda al servidor los borrados que ya no se pueden deshacer.
  const confirmarBorrados = useCallback(
    async (lista, { alSalir = false } = {}) => {
      if (!lista.length) return;
      const fallaron = [];
      await Promise.all(
        lista.map((c) =>
          fetch(`/api/history?id=${c.id}`, { method: "DELETE", keepalive: alSalir })
            .then((r) => {
              // 404: ya no existía, para el usuario es lo mismo que borrada.
              if (!r.ok && r.status !== 404) fallaron.push(c);
            })
            .catch(() => fallaron.push(c))
        )
      );
      window.dispatchEvent(new Event("novaia:historial"));
      if (alSalir) return;
      if (fallaron.length) {
        showToast(
          fallaron.length === 1
            ? `No se pudo borrar «${fallaron[0].title}». Probá de nuevo.`
            : `No se pudieron borrar ${fallaron.length} conversaciones. Probá de nuevo.`,
          { tone: "error" }
        );
        load();
      }
    },
    [load]
  );

  const vaciarPendientes = useCallback(
    (opts) => {
      clearTimeout(timerRef.current);
      const lista = pendientesRef.current;
      pendientesRef.current = [];
      setPendientes([]);
      confirmarBorrados(lista, opts);
    },
    [confirmarBorrados]
  );

  // Si se va de la página (o cierra la pestaña) con borrados en espera, se
  // confirman: "Deshacer" ya no está a la vista.
  useEffect(() => {
    const alOcultar = () => vaciarPendientes({ alSalir: true });
    window.addEventListener("pagehide", alOcultar);
    return () => {
      window.removeEventListener("pagehide", alOcultar);
      alOcultar();
    };
  }, [vaciarPendientes]);

  function borrar(c) {
    const siguiente = [...pendientesRef.current.filter((p) => p.id !== c.id), { id: c.id, title: c.title }];
    pendientesRef.current = siguiente;
    setPendientes(siguiente);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => vaciarPendientes(), DESHACER_MS);
  }

  function deshacer() {
    clearTimeout(timerRef.current);
    pendientesRef.current = [];
    setPendientes([]);
    searchRef.current?.focus();
  }

  async function borrarTodo() {
    setBorrandoTodo(true);
    clearTimeout(timerRef.current);
    pendientesRef.current = [];
    setPendientes([]);
    try {
      const res = await fetch(`/api/history`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems([]);
      setBuscados(null);
      setQ("");
      setConfirmarTodo(false);
      showToast("Borraste todo tu historial.");
      window.dispatchEvent(new Event("novaia:historial"));
    } catch {
      showToast("No se pudo borrar el historial. Revisá la conexión y probá de nuevo.", { tone: "error" });
    } finally {
      setBorrandoTodo(false);
    }
  }

  // --------------------------------------------------------------- fijar

  async function fijar(c) {
    const alternar = (lista) => lista && lista.map((x) => (x.id === c.id ? { ...x, pinned: x.pinned ? 0 : 1 } : x));
    // Optimista: se mueve ya; si falla, vuelve.
    setItems(alternar);
    setBuscados(alternar);
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "fijar", conv_id: c.id }),
      });
      if (!res.ok) throw new Error();
      window.dispatchEvent(new Event("novaia:historial"));
    } catch {
      setItems(alternar);
      setBuscados(alternar);
      showToast(c.pinned ? "No se pudo soltar la conversación." : "No se pudo fijar la conversación.", { tone: "error" });
    }
  }

  // ------------------------------------------------------------- derivados

  const ocultas = useMemo(() => new Set(pendientes.map((p) => p.id)), [pendientes]);
  const termino = q.trim();
  const visibles = items.filter((c) => !ocultas.has(c.id));
  const locales = visibles.filter((c) => (c.title || "").toLowerCase().includes(termino.toLowerCase()));
  const enBusqueda = termino.length > 0;
  const lista = buscados ? buscados.filter((c) => !ocultas.has(c.id)) : locales;

  // Sin búsqueda: fijadas arriba y el resto por fecha. Con búsqueda: una sola
  // lista, ordenada como la devuelve el servidor.
  const grupos = useMemo(() => {
    if (enBusqueda) return [{ key: "resultados", label: null, items: lista }];
    const hoy = inicioDelDia(new Date());
    const out = [];
    const fijadas = lista.filter((c) => !!c.pinned);
    if (fijadas.length) out.push({ key: "fijadas", label: "Fijadas", items: fijadas });
    const porKey = new Map();
    for (const c of lista) {
      if (c.pinned) continue;
      const g = grupoDe(parseFecha(c.created_at), hoy);
      if (!porKey.has(g.key)) {
        const nuevo = { ...g, items: [] };
        porKey.set(g.key, nuevo);
        out.push(nuevo);
      }
      porKey.get(g.key).items.push(c);
    }
    return out;
  }, [lista, enBusqueda]);

  // ------------------------------------------------------------- teclado

  function filas() {
    return listaRef.current ? [...listaRef.current.querySelectorAll(".history-item")] : [];
  }

  function onListaKeyDown(e) {
    const todas = filas();
    const i = todas.indexOf(document.activeElement);
    if (i === -1) return;
    let destino = null;
    if (e.key === "ArrowDown") destino = todas[i + 1];
    else if (e.key === "ArrowUp") destino = i === 0 ? searchRef.current : todas[i - 1];
    else if (e.key === "Home") destino = todas[0];
    else if (e.key === "End") destino = todas[todas.length - 1];
    else if (e.key === "Delete" || (e.key === "Backspace" && (e.metaKey || e.ctrlKey))) {
      const c = lista.find((x) => String(x.id) === todas[i].dataset.id);
      if (c) {
        e.preventDefault();
        borrar(c);
        // El foco sigue en la fila de al lado, no se pierde en el body.
        requestAnimationFrame(() => {
          const quedan = filas();
          (quedan[Math.min(i, quedan.length - 1)] || searchRef.current)?.focus();
        });
      }
      return;
    }
    if (destino) {
      e.preventDefault();
      destino.focus();
    }
  }

  function onSearchKeyDown(e) {
    if (e.key === "Escape" && q) {
      e.preventDefault();
      setQ("");
    } else if (e.key === "ArrowDown") {
      const primera = filas()[0];
      if (primera) {
        e.preventDefault();
        primera.focus();
      }
    } else if (e.key === "Enter") {
      const primera = lista[0];
      if (primera) go(`chat/${primera.id}`);
    }
  }

  // "/" lleva a la búsqueda desde cualquier lugar de la página.
  useEffect(() => {
    if (!auth) return;
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (document.querySelector(".modal-backdrop")) return;
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [auth?.id]);

  // --------------------------------------------------------------- render

  const total = visibles.length;
  const listo = auth && !loading && !error;

  let resumen = null;
  if (listo && total > 0) {
    if (!enBusqueda) {
      resumen = `${total} ${total === 1 ? "conversación" : "conversaciones"}`;
    } else if (buscados) {
      resumen =
        buscados.length >= 30
          ? `Las 30 más nuevas que dicen «${termino}»`
          : `${lista.length} ${lista.length === 1 ? "conversación dice" : "conversaciones dicen"} «${termino}»`;
    } else if (buscando) {
      resumen = "Buscando adentro de los mensajes…";
    } else {
      resumen = `${lista.length} ${lista.length === 1 ? "título coincide" : "títulos coinciden"}`;
    }
  }

  const ultimoPendiente = pendientes[pendientes.length - 1];

  return (
    <section className="page">
      <header className="page-head page-head-acc">
        <div>
          <h1>Historial</h1>
          <p>Buscá en todo lo que charlaste, no solo en los títulos. Fijá arriba lo que usás seguido.</p>
        </div>
        {auth && (
          <div className="actions">
            <button
              className="btn btn-quiet btn-danger"
              disabled={total === 0 || loading}
              onClick={() => setConfirmarTodo(true)}
            >
              <Icon name="trash" size={15} /> Borrar todo
            </button>
            <button className="btn btn-primary" onClick={() => go("chat")}>
              <Icon name="plusSq" size={15} /> Nuevo chat
            </button>
          </div>
        )}
      </header>

      {auth && (
        <div className="searchbox">
          <span className="icon"><Icon name="search" size={17} /></span>
          <input
            ref={searchRef}
            type="search"
            aria-label="Buscar en tus conversaciones"
            aria-keyshortcuts="/"
            aria-controls="hist-lista"
            placeholder="Buscar en tus conversaciones"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onSearchKeyDown}
            disabled={!!error}
            enterKeyHint="search"
          />
          {q ? (
            <button className="search-clear" aria-label="Limpiar búsqueda" onClick={() => { setQ(""); searchRef.current?.focus(); }}>
              <Icon name="x" size={16} />
            </button>
          ) : (
            <kbd className="hist-kbd" aria-hidden="true">/</kbd>
          )}
        </div>
      )}

      {!auth ? (
        <div className="empty">
          <Icon name="lock" size={22} />
          <h2>Iniciá sesión para ver tu historial</h2>
          <p>Las conversaciones se guardan en tu cuenta y solo las ves vos.</p>
          <button className="btn btn-primary" onClick={() => go("login")}>Iniciar sesión</button>
        </div>
      ) : loading && items.length === 0 ? (
        <div className="skeleton-list" role="status" aria-label="Cargando tu historial">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : error === "sesion" ? (
        <div className="empty">
          <Icon name="lock" size={22} />
          <h2>Tu sesión se cerró</h2>
          <p>Volvé a entrar y tus conversaciones siguen acá, como las dejaste.</p>
          <button className="btn btn-primary" onClick={() => go("login")}>Iniciar sesión</button>
        </div>
      ) : error ? (
        <div className="empty" role="alert">
          <Icon name="refresh" size={22} />
          <h2>No pudimos traer tu historial</h2>
          <p>Tus conversaciones no se borraron: falló la conexión con el servidor. Probá de nuevo en un rato.</p>
          <button className="btn btn-quiet" onClick={load}>Reintentar</button>
        </div>
      ) : (
        <>
          {(resumen || racha >= 2) && (
            <div className="history-count" aria-live="polite">
              <span>{resumen}</span>
              {racha >= 2 && !enBusqueda && (
                <span className="hist-racha">Van {racha} días seguidos usando Nova</span>
              )}
            </div>
          )}

          {lista.length === 0 && !(enBusqueda && buscando) && (
            <div className="empty">
              <Icon name="chat" size={22} />
              <h2>{total === 0 ? "Todavía no hay conversaciones" : `Nada dice «${termino}»`}</h2>
              <p>
                {total === 0
                  ? "Cada chat que empieces se guarda acá solo, y lo podés buscar por cualquier palabra que haya adentro."
                  : "Probá con otra palabra o con una más corta: la búsqueda mira adentro de los mensajes."}
              </p>
              <button className="btn btn-quiet" onClick={() => (total === 0 ? go("chat") : setQ(""))}>
                {total === 0 ? "Empezar un chat" : "Limpiar la búsqueda"}
              </button>
            </div>
          )}

          <div id="hist-lista" ref={listaRef} onKeyDown={onListaKeyDown} aria-busy={buscando || undefined}>
            {grupos.map((g) =>
              g.items.length === 0 ? null : (
                <section key={g.key} className="hist-grupo" aria-labelledby={g.label ? `hg-${g.key}` : undefined}>
                  {g.label && (
                    <h2 className="hist-grupo-h" id={`hg-${g.key}`}>
                      {g.key === "fijadas" && <Icon name="pin" size={14} />}
                      {g.label}
                    </h2>
                  )}
                  <ul className="history-list">
                    {g.items.map((c) => {
                      const d = parseFecha(c.created_at);
                      const cuando = !d ? "" : g.key === "hoy" ? fmtHora(d) : fmtCorto(d);
                      const titulo = c.title || "Sin título";
                      return (
                        <li key={c.id}>
                          <button
                            className="history-item"
                            data-id={c.id}
                            onClick={() => go(`chat/${c.id}`)}
                          >
                            <strong>
                              {!!c.pinned && enBusqueda && <Icon name="pin" size={14} />}
                              <span><Resaltado texto={titulo} termino={termino} /></span>
                            </strong>
                            {c.extracto && (
                              <span className="hi-extracto">
                                <Resaltado texto={c.extracto} termino={termino} />
                                {c.extracto.length >= 160 ? "…" : ""}
                              </span>
                            )}
                            <span className="meta">
                              {d && <time dateTime={d.toISOString()}>{cuando}</time>}
                              {c.mensajes != null ? `${d ? ", " : ""}${c.mensajes} ${c.mensajes === 1 ? "mensaje" : "mensajes"}` : ""}
                            </span>
                          </button>
                          <button
                            className={"icon-btn" + (c.pinned ? " fijada" : "")}
                            title={c.pinned ? "Soltar" : "Fijar arriba"}
                            aria-label={c.pinned ? `Soltar ${titulo}` : `Fijar ${titulo} arriba`}
                            aria-pressed={!!c.pinned}
                            onClick={() => fijar(c)}
                          >
                            <Icon name="pin" size={16} />
                          </button>
                          <button
                            className="icon-btn icon-danger"
                            title="Borrar (Supr)"
                            aria-label={`Borrar ${titulo}`}
                            aria-keyshortcuts="Delete"
                            onClick={() => borrar(c)}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )
            )}
          </div>
        </>
      )}

      <div className="hist-deshacer-slot" role="status" aria-live="polite">
        {ultimoPendiente && (
          <div className="hist-deshacer">
            <span>
              {pendientes.length === 1 ? (
                <>Borraste <strong>«{ultimoPendiente.title || "Sin título"}»</strong>.</>
              ) : (
                <>Borraste {pendientes.length} conversaciones.</>
              )}
            </span>
            <button className="btn btn-sm btn-quiet" onClick={deshacer}>
              <Icon name="refresh" size={14} /> Deshacer
            </button>
          </div>
        )}
      </div>

      <Modal
        open={confirmarTodo}
        onClose={() => !borrandoTodo && setConfirmarTodo(false)}
        title="¿Borrar todo tu historial?"
        footer={
          <div className="modal-cta">
            <button className="btn btn-block hist-btn-borrar" onClick={borrarTodo} disabled={borrandoTodo}>
              <Icon name="trash" size={15} />
              {borrandoTodo ? "Borrando…" : `Borrar ${total} ${total === 1 ? "conversación" : "conversaciones"}`}
            </button>
            <button className="btn btn-quiet btn-block" onClick={() => setConfirmarTodo(false)} disabled={borrandoTodo}>
              Cancelar
            </button>
          </div>
        }
      >
        <p>
          Se borran todas las conversaciones y sus mensajes, también las fijadas. Esto no se puede deshacer.
          Lo que guardaste en la memoria de Nova no se toca.
        </p>
      </Modal>
    </section>
  );
}
