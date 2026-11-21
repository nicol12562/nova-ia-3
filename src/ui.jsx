import React, { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./icons.jsx";

/* ------------------------------------------------------------------
   Toasts: feedback liviano en lugar de alert()
   Los errores se anuncian con role="alert" (interrumpen al lector de
   pantalla); el resto, con role="status". El temporizador se pausa
   mientras el puntero o el foco están sobre el aviso, y cada uno se
   puede cerrar a mano.
   ------------------------------------------------------------------ */
const TOAST_EVENT = "novaia:toast";
const TOAST_MS = { info: 3400, error: 6000 };

export function showToast(message, opts = {}) {
  const tone = opts.tone ?? "info";
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, { detail: { message, tone, ms: opts.ms ?? TOAST_MS[tone] ?? TOAST_MS.info } })
  );
}

function ToastItem({ item, onDone }) {
  const restante = useRef(item.ms);
  const inicio = useRef(0);
  const timer = useRef(0);

  const correr = () => {
    window.clearTimeout(timer.current);
    inicio.current = Date.now();
    timer.current = window.setTimeout(() => onDone(item.id), Math.max(800, restante.current));
  };
  const pausar = () => {
    window.clearTimeout(timer.current);
    restante.current -= Date.now() - inicio.current;
  };

  useEffect(() => {
    restante.current = item.ms;
    correr();
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.veces]);

  const error = item.tone === "error";
  return (
    <div
      className={"toast toast-" + (item.tone || "info")}
      role={error ? "alert" : "status"}
      aria-atomic="true"
      onPointerEnter={pausar}
      onPointerLeave={correr}
      onFocus={pausar}
      onBlur={correr}
    >
      <span className="toast-dot" aria-hidden="true" />
      {error && <span className="sr-only">Error: </span>}
      <span className="toast-msg">{item.message}</span>
      <button type="button" className="toast-x" onClick={() => onDone(item.id)} aria-label="Cerrar aviso">
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

export function Toaster() {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  useEffect(() => {
    const onToast = (e) => {
      const detail = e.detail || {};
      if (!detail.message) return;
      setItems((prev) => {
        // El mismo aviso dos veces seguidas no se apila: reinicia su tiempo.
        const igual = prev.find((x) => x.message === detail.message && x.tone === detail.tone);
        if (igual) return prev.map((x) => (x === igual ? { ...x, ms: detail.ms, veces: x.veces + 1 } : x));
        const id = ++idRef.current;
        return [...prev.slice(-2), { id, message: detail.message, tone: detail.tone, ms: detail.ms ?? TOAST_MS.info, veces: 0 }];
      });
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  const quitar = (id) => setItems((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="toaster" aria-label="Avisos">
      {items.map((t) => (
        <ToastItem key={t.id} item={t} onDone={quitar} />
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
   Con diálogos apilados (un confirmar arriba de un detalle) solo el de
   arriba atiende Escape y Tab, así Esc cierra uno por vez.
   ------------------------------------------------------------------ */
const ENFOCABLES =
  'a[href],area[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),summary,iframe,[contenteditable]:not([contenteditable="false"]),[tabindex]:not([tabindex="-1"])';

const pilaDialogos = [];

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
    const token = {};
    pilaDialogos.push(token);
    const arriba = () => pilaDialogos[pilaDialogos.length - 1] === token;
    const anterior = document.activeElement;
    const items = () =>
      [...caja.querySelectorAll(ENFOCABLES)].filter(
        (el) => el.offsetParent !== null && !el.closest("[inert]") && el.getAttribute("aria-hidden") !== "true"
      );

    // Si un campo ya tomó el foco (autoFocus), se respeta. Si no, el botón
    // primario antes que la X: es la acción que el diálogo propone.
    if (!caja.contains(document.activeElement)) {
      (caja.querySelector("[data-autofocus]") || caja.querySelector(".btn-primary:not(:disabled)") || items()[0] || caja).focus({ preventScroll: true });
    }

    const onKey = (e) => {
      if (!arriba()) return;
      if (e.key === "Escape") {
        if (e.isComposing || e.defaultPrevented) return;
        e.preventDefault();
        e.stopPropagation();
        cerrarRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const lista = items();
      if (!lista.length) {
        e.preventDefault();
        caja.focus();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const actual = document.activeElement;
      if (!caja.contains(actual)) {
        e.preventDefault();
        (e.shiftKey ? ultimo : primero).focus();
      } else if (e.shiftKey && (actual === primero || actual === caja)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && actual === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    // Si algo afuera roba el foco (un click en el scrim, un script), vuelve.
    const onFocusIn = (e) => {
      if (!arriba() || caja.contains(e.target)) return;
      if (e.target.closest && e.target.closest(".toaster")) return;
      (items()[0] || caja).focus({ preventScroll: true });
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
      const i = pilaDialogos.indexOf(token);
      if (i >= 0) pilaDialogos.splice(i, 1);
      // El trigger puede haberse desmontado con el diálogo.
      if (anterior && anterior.focus && anterior !== document.body && document.contains(anterior)) {
        anterior.focus({ preventScroll: true });
      }
    };
  }, [activo]);
}

/* ------------------------------------------------------------------
   Modal accesible con salida por Esc y click en el fondo.
   Props opcionales: description (texto de apoyo bajo el título, va a
   aria-describedby), busy (mientras corre una acción no se cierra por
   Esc ni por el fondo, y la X queda deshabilitada), closeLabel.
   `eyebrow` se mantiene por compatibilidad y se muestra como bajada.
   ------------------------------------------------------------------ */
export function Modal({ open, onClose, eyebrow, title, children, footer, description, busy = false, closeLabel = "Cerrar" }) {
  const cajaRef = useRef(null);
  const abajoEnFondo = useRef(false);
  const id = useId();
  const tituloId = id + "-t";
  const descId = id + "-d";
  const bajada = description ?? eyebrow;

  const cerrar = () => {
    if (!busy) onClose?.();
  };
  useFocoAtrapado(cajaRef, open, cerrar);

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
      // Cerrar solo si el click empezó y terminó en el fondo: seleccionar
      // texto adentro y soltar afuera no debe cerrar el diálogo.
      onMouseDown={(e) => {
        abajoEnFondo.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (abajoEnFondo.current && e.target === e.currentTarget) cerrar();
        abajoEnFondo.current = false;
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? tituloId : undefined}
        aria-label={title ? undefined : closeLabel}
        aria-describedby={bajada ? descId : undefined}
        aria-busy={busy || undefined}
        tabIndex={-1}
        ref={cajaRef}
      >
        <button type="button" className="modal-x" onClick={cerrar} disabled={busy} aria-label={closeLabel}>
          <Icon name="x" size={18} />
        </button>
        {title && <h2 id={tituloId}>{title}</h2>}
        {bajada && <p className="modal-sub" id={descId}>{bajada}</p>}
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
