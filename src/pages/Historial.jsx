import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "../icons.jsx";
import { showToast } from "../ui.jsx";

function fmtDate(value) {
  if (!value) return "";
  const raw = String(value);
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 16).replace("T", " ");
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(/[-.]/g, " ").trim();
}

export default function Historial({ go, auth }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/history`);
      setItems(res.ok ? await res.json() : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [auth?.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function removeOne(id) {
    await fetch(`/api/history?id=${id}`, { method: "DELETE" });
    showToast("Conversación borrada.");
    load();
    window.dispatchEvent(new Event("novaia:historial"));
  }

  async function removeAll() {
    if (!confirm("¿Borrar todo tu historial? No se puede deshacer.")) return;
    await fetch(`/api/history`, { method: "DELETE" });
    showToast("Historial borrado.");
    load();
    window.dispatchEvent(new Event("novaia:historial"));
  }

  const visibles = items.filter((c) => (c.title || "").toLowerCase().includes(q.toLowerCase()));

  // Búsqueda del servidor: encuentra texto DENTRO de los mensajes, no sólo en
  // el título. Con poco texto alcanza el filtro local.
  const [buscados, setBuscados] = useState(null);
  useEffect(() => {
    const t = q.trim();
    if (!auth || t.length < 2) {
      setBuscados(null);
      return;
    }
    let vivo = true;
    const timer = setTimeout(() => {
      fetch(`/api/history?q=${encodeURIComponent(t)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (vivo) setBuscados(Array.isArray(d?.resultados) ? d.resultados : null);
        })
        .catch(() => {});
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [q, auth?.id]);

  async function fijar(id) {
    try {
      await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "fijar", conv_id: id }),
      });
      load();
      window.dispatchEvent(new Event("novaia:historial"));
    } catch {
      showToast("No se pudo actualizar la conversación.", { tone: "error" });
    }
  }

  const lista = buscados ?? visibles;

  return (
    <section className="page">
      <header className="page-head page-head-acc">
        <div>
          <h1>Historial</h1>
          <p>Buscá en todo lo que charlaste, no solo en los títulos. Fijá arriba lo que usás seguido.</p>
        </div>
        {auth && (
          <div className="actions">
            <button className="btn btn-quiet btn-danger" disabled={items.length === 0} onClick={removeAll}>
              <Icon name="trash" size={15} /> Borrar todo
            </button>
            <button className="btn btn-primary" onClick={() => go("chat")}>
              <Icon name="plusSq" size={15} /> Nuevo chat
            </button>
          </div>
        )}
      </header>

      <div className="searchbox">
        <span className="icon"><Icon name="search" size={17} /></span>
        <input
          aria-label="Buscar en tus conversaciones"
          placeholder="Buscar en tus conversaciones"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button className="search-clear" aria-label="Limpiar búsqueda" onClick={() => setQ("")}>
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      {!auth ? (
        <div className="empty">
          <Icon name="lock" size={22} />
          <h2>Iniciá sesión para ver tu historial</h2>
          <p>Las conversaciones se guardan en tu cuenta y solo las ves vos.</p>
          <button className="btn btn-primary" onClick={() => go("login")}>Iniciar sesión</button>
        </div>
      ) : (
        <>
          {loading && (
            <div className="skeleton-list" aria-hidden="true">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          )}
          {!loading && items.length > 0 && (
            <div className="history-count">
              {lista.length} {lista.length === 1 ? "conversación" : "conversaciones"}
              {buscados ? " con ese texto" : ""}
            </div>
          )}
          {!loading && lista.length === 0 && (
            <div className="empty">
              <Icon name="chat" size={22} />
              <h2>{items.length === 0 ? "Todavía no hay conversaciones" : "Nada coincide"}</h2>
              <p>
                {items.length === 0
                  ? "Cada chat que empieces se guarda acá solo."
                  : "Probá con otra palabra: la búsqueda mira adentro de los mensajes."}
              </p>
              <button className="btn btn-quiet" onClick={() => (items.length === 0 ? go("chat") : setQ(""))}>
                {items.length === 0 ? "Empezar un chat" : "Limpiar la búsqueda"}
              </button>
            </div>
          )}
          <ul className="history-list">
            {lista.map((c) => (
              <li key={c.id}>
                <button className="history-item" onClick={() => go(`chat/${c.id}`)}>
                  <strong>
                    {!!c.pinned && <Icon name="pin" size={14} />}
                    <span>{c.title}</span>
                  </strong>
                  {c.extracto && <span className="hi-extracto">…{c.extracto}</span>}
                  <span className="meta">
                    {fmtDate(c.created_at)}
                    {c.mensajes != null ? `, ${c.mensajes} mensajes` : ""}
                  </span>
                </button>
                <button
                  className={"icon-btn" + (c.pinned ? " fijada" : "")}
                  title={c.pinned ? "Desfijar" : "Fijar arriba"}
                  aria-label={c.pinned ? `Desfijar ${c.title}` : `Fijar ${c.title} arriba`}
                  aria-pressed={!!c.pinned}
                  onClick={() => fijar(c.id)}
                >
                  <Icon name="pin" size={16} />
                </button>
                <button
                  className="icon-btn icon-danger"
                  title="Borrar"
                  aria-label={`Borrar ${c.title}`}
                  onClick={() => removeOne(c.id)}
                >
                  <Icon name="trash" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
