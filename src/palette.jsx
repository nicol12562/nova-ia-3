import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { useFocoAtrapado } from "./ui.jsx";

// Paleta de comandos (⌘K). Lo primero que aparece es "Nuevo chat", así que
// ⌘K + Enter sigue haciendo lo que hacía antes. Escribiendo, filtra acciones
// y busca dentro de las conversaciones guardadas.

const sinTildes = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Palette({ open, onClose, acciones, chats, auth, go }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [remotos, setRemotos] = useState(null);
  const cajaRef = useRef(null);
  const inputRef = useRef(null);
  useFocoAtrapado(cajaRef, open, onClose);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setSel(0);
    setRemotos(null);
    // El hook de foco elige el primer enfocable; acá queremos el buscador.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Búsqueda dentro de los mensajes, igual que en Historial.
  useEffect(() => {
    const t = q.trim();
    if (!open || !auth || t.length < 2) {
      setRemotos(null);
      return;
    }
    let vivo = true;
    const timer = setTimeout(() => {
      fetch(`/api/history?q=${encodeURIComponent(t)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => vivo && setRemotos(Array.isArray(d?.resultados) ? d.resultados : null))
        .catch(() => {});
    }, 220);
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [q, open, auth?.id]);

  const items = useMemo(() => {
    const t = sinTildes(q.trim());
    const acc = acciones
      .filter((a) => !t || sinTildes(a.label).includes(t))
      .map((a) => ({ ...a, grupo: "Ir a" }));
    const base = remotos ?? chats.filter((c) => !t || sinTildes(c.title).includes(t));
    const conv = base.slice(0, 8).map((c) => ({
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

  if (!open) return null;

  const ejecutar = (it) => {
    onClose();
    it.run();
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => (items.length ? (s + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (items.length ? (s - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter" && items[sel]) {
      e.preventDefault();
      ejecutar(items[sel]);
    }
  };

  let grupoPrevio = null;
  return (
    <div
      className="pal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pal" role="dialog" aria-modal="true" aria-label="Buscar y saltar" ref={cajaRef} tabIndex={-1}>
        <div className="pal-input">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={onKey}
            placeholder={auth ? "Buscá una pantalla o algo que hayas charlado" : "Buscá una pantalla"}
            aria-label="Buscar"
            role="combobox"
            aria-expanded="true"
            aria-controls="pal-lista"
            aria-activedescendant={items[sel] ? "pal-" + items[sel].id : undefined}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="pal-lista" id="pal-lista" role="listbox">
          {items.length === 0 && <li className="pal-vacio">Nada coincide con “{q}”.</li>}
          {items.map((it, i) => {
            const cabecera = it.grupo !== grupoPrevio ? it.grupo : null;
            grupoPrevio = it.grupo;
            return (
              <React.Fragment key={it.id}>
                {cabecera && <li className="pal-grupo" role="presentation">{cabecera}</li>}
                <li
                  id={"pal-" + it.id}
                  role="option"
                  aria-selected={i === sel}
                  className={"pal-item" + (i === sel ? " sel" : "")}
                  onMouseMove={() => setSel(i)}
                  onClick={() => ejecutar(it)}
                >
                  <Icon name={it.icon} size={16} />
                  <span className="pal-t">
                    {it.label}
                    {it.extra && <small>{it.extra}</small>}
                  </span>
                  {it.atajo && <kbd>{it.atajo}</kbd>}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
        <p className="pal-pie">
          <span><kbd>↑</kbd><kbd>↓</kbd> para moverte</span>
          <span><kbd>Enter</kbd> para abrir</span>
        </p>
      </div>
    </div>
  );
}
