import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "../icons.jsx";
import { showToast, spotlight } from "../ui.jsx";

function fmtDate(value) {
  if (!value) return "";
  const raw = String(value);
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 16).replace("T", " ");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export default function Historial({ go, auth }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/history?user_id=${auth.id}`);
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
    await fetch(`/api/history?user_id=${auth.id}&id=${id}`, { method: "DELETE" });
    showToast("Conversación eliminada.");
    load();
  }

  async function removeAll() {
    if (!confirm("¿Seguro que querés eliminar todo tu historial? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/history?user_id=${auth.id}`, { method: "DELETE" });
    showToast("Historial eliminado.");
    load();
  }

  const visibles = items.filter((c) => (c.title || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">03 · TU ESPACIO</p>
          <h1 className="hero">Tu historial</h1>
          <p className="lede">Volvé a conversaciones guardadas o eliminá las que ya no necesitás.</p>
        </div>
        {auth && (
          <div className="actions">
            <button
              className="btn-plain"
              disabled={items.length === 0}
              onClick={removeAll}
              style={{ opacity: items.length === 0 ? 0.5 : 1 }}
            >
              <Icon name="x" size={15} /> Eliminar todo
            </button>
            <button className="btn btn-primary" onClick={() => go("chat")}>
              <Icon name="plusSq" size={15} /> Nuevo chat
            </button>
          </div>
        )}
      </div>

      <div className="searchbox">
        <span className="icon"><Icon name="search" size={17} /></span>
        <input
          placeholder="Buscar conversaciones…"
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
        <div className="empty-state">
          <span className="sq"><Icon name="lock" size={22} /></span>
          <h3>Iniciá sesión para ver tu historial</h3>
          <p>Las conversaciones se guardan de forma privada en tu cuenta.</p>
          <button className="linklike" onClick={() => go("login")}>
            Iniciar sesión <Icon name="arrowUpRight" size={13} />
          </button>
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
              {visibles.length} {visibles.length === 1 ? "conversación" : "conversaciones"}
            </div>
          )}
          {!loading && visibles.length === 0 && (
            <div className="empty-state">
              <span className="sq"><Icon name="chat" size={22} /></span>
              <h3>{items.length === 0 ? "Todavía no tenés conversaciones" : "Sin resultados"}</h3>
              <p>
                {items.length === 0
                  ? "Empezá una conversación desde Nuevo chat y te la guardamos acá."
                  : "Ninguna conversación coincide con la búsqueda."}
              </p>
              <button className="linklike" onClick={() => (items.length === 0 ? go("chat") : setQ(""))}>
                {items.length === 0 ? "Nuevo chat" : "Limpiar búsqueda"}{" "}
                <Icon name="arrowUpRight" size={13} />
              </button>
            </div>
          )}
          <ul className="history-list">
            {visibles.map((c) => (
              <li key={c.id}>
                <button
                  className="history-item spot"
                  onPointerMove={spotlight.onPointerMove}
                  onClick={() => go(`chat/${c.id}`)}
                >
                  <span className="hi-sq"><Icon name="chat" size={15} /></span>
                  <strong>{c.title}</strong>
                  <span className="meta">
                    {c.mensajes} mensajes · {fmtDate(c.created_at)}
                  </span>
                </button>
                <button
                  className="icon-danger"
                  title="Eliminar conversación"
                  aria-label="Eliminar conversación"
                  onClick={() => removeOne(c.id)}
                >
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
