import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./icons.jsx";

/* ------------------------------------------------------------------
   Toasts: feedback liviano en lugar de alert()
   ------------------------------------------------------------------ */
const TOAST_EVENT = "novaia:toast";

export function showToast(message, opts = {}) {
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, { detail: { message, tone: opts.tone ?? "info", ms: opts.ms ?? 3400 } })
  );
}

export function Toaster() {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  useEffect(() => {
    const onToast = (e) => {
      const id = ++idRef.current;
      const detail = e.detail || {};
      setItems((prev) => [...prev.slice(-2), { id, message: detail.message, tone: detail.tone }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, detail.ms ?? 3400);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={"toast toast-" + (t.tone || "info")}>
          <span className="toast-dot" />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------
   Spotlight: la luz sigue al puntero (SkillUI)
   ------------------------------------------------------------------ */
export const spotlight = {
  onPointerMove(e) {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  },
};

/* ------------------------------------------------------------------
   Foco atrapado: el diálogo recibe el foco, cicla Tab adentro y lo
   devuelve al trigger al cerrarse. Sin esto, desde un modal se tabbea la
   página que quedó detrás del scrim.
   ------------------------------------------------------------------ */
const ENFOCABLES =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useFocoAtrapado(ref, activo, onCerrar) {
  // onCerrar suele ser una flecha inline del padre: si entrara en las
  // dependencias, el efecto se repetiría en cada render y el foco saltaría
  // mientras el usuario está escribiendo.
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;

  useEffect(() => {
    if (!activo) return;
    const caja = ref.current;
    if (!caja) return;
    const anterior = document.activeElement;
    const items = () => [...caja.querySelectorAll(ENFOCABLES)].filter((el) => el.offsetParent !== null);

    // El botón primario antes que la X: es la acción que el diálogo propone.
    (caja.querySelector(".btn-primary") || items()[0] || caja).focus();

    const onKey = (e) => {
      if (e.key === "Escape") {
        cerrarRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const lista = items();
      if (!lista.length) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (e.shiftKey && (document.activeElement === primero || document.activeElement === caja)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // El trigger puede haberse desmontado con el diálogo.
      if (anterior && anterior.focus && document.contains(anterior)) anterior.focus();
    };
  }, [activo]);
}

/* ------------------------------------------------------------------
   Modal accesible con salida por Esc y click en el fondo
   ------------------------------------------------------------------ */
export function Modal({ open, onClose, eyebrow, title, children, footer }) {
  const cajaRef = useRef(null);
  useFocoAtrapado(cajaRef, open, onClose);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={cajaRef}>
        <button className="modal-x" onClick={onClose} aria-label="Cerrar">
          <Icon name="x" size={18} />
        </button>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        <div className="modal-body">{children}</div>
        {footer}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Contador animado para métricas
   ------------------------------------------------------------------ */
export function useCountUp(target, duration = 850) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const end = Number(target);
    if (!Number.isFinite(end)) {
      setValue(0);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(end);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(end * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

/* ------------------------------------------------------------------
   Copiar al portapapeles con fallback
   ------------------------------------------------------------------ */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
