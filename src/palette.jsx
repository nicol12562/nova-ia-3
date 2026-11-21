import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { useFocoAtrapado } from "./ui.jsx";

// Paleta de comandos (⌘K). Lo primero que aparece es "Nuevo chat", así que
// ⌘K + Enter sigue haciendo lo que hacía antes. Escribiendo, filtra acciones
// y busca dentro de las conversaciones guardadas.
//
// Patrón ARIA: combobox editable con listbox. El foco no sale nunca del
// buscador; la opción activa se anuncia con aria-activedescendant.

// "Canción" encuentra "cancion" y "nino" encuentra "niño", y al revés.
const plano = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Todas las palabras tienen que aparecer, en cualquier orden.
const coincide = (texto, palabras) => {
  if (!palabras.length) return true;
  const t = plano(texto);
  return palabras.every((p) => t.includes(p));
};

export default function Palette({ open, onClose, acciones, chats, auth, go }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [remotos, setRemotos] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const cajaRef = useRef(null);
  const inputRef = useRef(null);
  const base = useId().replace(/:/g, "");
  const idLista = base + "-lista";
  const idOpcion = (i) => `${base}-op-${i}`;

  // Atrapa el Tab, cierra con Escape y devuelve el foco a quien abrió la paleta.
  useFocoAtrapado(cajaRef, open, onClose);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setSel(0);
    setRemotos(null);
    setBuscando(false);
    // El hook de foco elige el primer enfocable; acá queremos el buscador.
    inputRef.current?.focus();
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Búsqueda dentro de los mensajes, igual que en Historial.
  useEffect(() => {
    const t = q.trim();
    if (!open || !auth || t.length < 2) {
      setRemotos(null);
      setBuscando(false);
      return;
    }
    let vivo = true;
    setBuscando(true);
    const timer = setTimeout(() => {
      fetch(`/api/history?q=${encodeURIComponent(t)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => vivo && setRemotos(Array.isArray(d?.resultados) ? d.resultados : null))
        .catch(() => {})
        .finally(() => vivo && setBuscando(false));
    }, 220);
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [q, open, auth?.id]);

  const items = useMemo(() => {
    const palabras = plano(q).split(/\s+/).filter(Boolean);
    const acc = acciones
      .filter((a) => coincide(a.label, palabras))
      .map((a) => ({ ...a, grupo: "Ir a" }));
    const fuente = remotos ?? chats.filter((c) => coincide(c.title, palabras));
    const conv = fuente.slice(0, 8).map((c) => ({
      id: "c" + c.id,
      label: c.title || "Sin título",
      extra: c.extracto,
      icon: c.pinned ? "pin" : "chat",
      grupo: "Conversaciones",
      run: () => go(`chat/${c.id}`),
    }));
    return [...acc, ...conv];
  }, [q, acciones, chats, remotos]);

  useEffect(() => {
    setSel((s) => Math.min(s, Math.max(0, items.length - 1)));
  }, [items.length]);

  // La opción activa siempre a la vista, también al moverse con el teclado.
  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(idOpcion(sel));
    el?.scrollIntoView({ block: "nearest" });
  }, [sel, open, items]);

  if (!open) return null;

  const ejecutar = (it) => {
    onClose();
    it.run();
  };

  const mover = (i) => {
    if (!items.length) return;
    setSel((i + items.length) % items.length);
  };

  const onKey = (e) => {
    if (e.nativeEvent.isComposing) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        mover(sel + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        mover(sel - 1);
        break;
      case "Home":
        if (!items.length) return;
        e.preventDefault();
        setSel(0);
        break;
      case "End":
        if (!items.length) return;
        e.preventDefault();
        setSel(items.length - 1);
        break;
      case "PageDown":
        if (!items.length) return;
        e.preventDefault();
        setSel(Math.min(items.length - 1, sel + 5));
        break;
      case "PageUp":
        if (!items.length) return;
        e.preventDefault();
        setSel(Math.max(0, sel - 5));
        break;
      case "Enter":
        if (!items[sel]) return;
        e.preventDefault();
        ejecutar(items[sel]);
        break;
      default:
    }
  };

  // Agrupa conservando el índice plano que usan el teclado y aria-activedescendant.
  const grupos = [];
  items.forEach((it, i) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.nombre === it.grupo) ultimo.filas.push([it, i]);
    else grupos.push({ nombre: it.grupo, filas: [[it, i]] });
  });

  const texto = q.trim();
  const hayLista = items.length > 0;
  const estado = buscando
    ? "Buscando en tus charlas…"
    : hayLista
      ? `${items.length} ${items.length === 1 ? "resultado" : "resultados"}`
      : `Nada coincide con “${texto}”`;

  return (
    <div
      className="pal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pal" role="dialog" aria-modal="true" aria-label="Buscar y saltar" ref={cajaRef} tabIndex={-1}>
        <div className="pal-input">
          <span className="pal-lupa" aria-hidden="true">
            <Icon name="search" size={18} />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={onKey}
            placeholder={auth ? "Buscá una pantalla o algo que hayas charlado" : "Buscá una pantalla"}
            aria-label={auth ? "Buscar pantallas y conversaciones" : "Buscar pantallas"}
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={hayLista}
            aria-controls={idLista}
            aria-activedescendant={hayLista ? idOpcion(sel) : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
          />
          <button type="button" className="pal-cerrar" onClick={onClose} aria-label="Cerrar la búsqueda">
            <kbd aria-hidden="true">Esc</kbd>
          </button>
        </div>

        <div className="pal-lista" id={idLista} role="listbox" aria-label="Resultados">
          {grupos.map((g, gi) => (
            <div key={g.nombre} role="group" aria-labelledby={`${base}-g${gi}`} className="pal-bloque">
              <div className="pal-grupo" id={`${base}-g${gi}`} role="presentation">
                {g.nombre}
              </div>
              {g.filas.map(([it, i]) => (
                <div
                  key={it.id}
                  id={idOpcion(i)}
                  role="option"
                  aria-selected={i === sel}
                  className={"pal-item" + (i === sel ? " sel" : "")}
                  onMouseMove={() => i !== sel && setSel(i)}
                  // Que el clic no le robe el foco al buscador.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => ejecutar(it)}
                >
                  <span className="pal-ico" aria-hidden="true">
                    <Icon name={it.icon} size={16} />
                  </span>
                  <span className="pal-t">
                    <span className="pal-label">{it.label}</span>
                    {it.extra && <small>{it.extra}</small>}
                  </span>
                  {it.atajo && <kbd aria-hidden="true">{it.atajo}</kbd>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {!hayLista && (
          <div className="pal-vacio">
            {buscando ? (
              <p>Buscando en tus charlas…</p>
            ) : (
              <>
                <p className="pal-vacio-t">Nada coincide con “{texto}”.</p>
                <p>
                  {auth
                    ? "Probá con otra palabra o con un pedazo de algo que hayas escrito."
                    : "Probá con otra palabra. Para buscar dentro de tus charlas, entrá con tu cuenta."}
                </p>
              </>
            )}
          </div>
        )}

        <p className="pal-sr" role="status" aria-live="polite">
          {texto ? estado : ""}
        </p>

        <p className="pal-pie" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> para moverte</span>
          <span><kbd>Enter</kbd> para abrir</span>
          <span><kbd>Esc</kbd> para cerrar</span>
        </p>
      </div>
    </div>
  );
}
