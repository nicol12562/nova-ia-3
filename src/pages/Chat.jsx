import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../icons.jsx";
import Md from "../md.jsx";
import Canvas from "../canvas.jsx";
import { piezaDe } from "../piece.js";
import { copyText, showToast, Modal } from "../ui.jsx";
import { AGENTS, AGENT_KEY } from "../data/agents.js";
import { leerPrefs } from "../data/prefs.js";
import { COLOR_MODELO } from "./Home.jsx";

const leerBorrador = () => {
  try {
    const t = sessionStorage.getItem(DRAFT_KEY);
    if (!t) return "";
    sessionStorage.removeItem(DRAFT_KEY);
    return t;
  } catch {
    return "";
  }
};

const leerAgente = () => {
  try {
    const id = sessionStorage.getItem(AGENT_KEY);
    return AGENTS.find((a) => a.id === id) || null;
  } catch {
    return null;
  }
};

// Visitantes: 3 mensajes por día. El contador del navegador es la señal visible;
// el servidor corta por IP, así que limpiar el storage ya no alcanza.
const GUEST_KEY = "novaia_guest_msgs";
export const GUEST_LIMIT = 3;
const hoy = () => new Date().toISOString().slice(0, 10);
const leerGuest = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_KEY) || "null");
    return raw && raw.day === hoy() ? raw : { day: hoy(), n: 0 };
  } catch {
    return { day: hoy(), n: 0 };
  }
};
const escribirGuest = (n) => {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify({ day: hoy(), n }));
  } catch {
    /* sin storage disponible */
  }
};

const SUGGESTIONS = [
  { i: "send", t: "Contestale a un cliente", d: "Un cliente me pregunta por WhatsApp si hacemos envíos al interior y cuánto tarda. Respondele corto y amable." },
  { i: "knot", t: "Explicame un tema", d: "Explicame un tema difícil de forma sencilla, con un ejemplo de todos los días." },
  { i: "bot", t: "Programá conmigo", d: "Ayudame a planificar una pequeña aplicación web: qué pantallas, qué datos y por dónde arranco." },
  { i: "wand", t: "Dame ideas", d: "Dame 5 ideas concretas para promocionar un emprendimiento chico en Instagram." },
];

const fmt = (n) => Math.round(n || 0).toLocaleString("es-AR");

// Lo que escucha un lector de pantalla al terminar una respuesta: texto plano,
// sin la sintaxis de Markdown y con un tope para no leer una página entera.
const textoPlano = (md) =>
  (md || "")
    .replace(/```[\s\S]*?```/g, " (bloque de código) ")
    .replace(/[#*_`>|~]+/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
const resumenParaLeer = (md) => {
  const t = textoPlano(md);
  return t.length > 600 ? t.slice(0, 600) + "… La respuesta sigue en pantalla." : t;
};

// Mensaje entendible para un fallo de red o del servidor, nunca el error crudo.
const explicarError = (e) => {
  if (e instanceof TypeError || /failed to fetch|network|load failed/i.test(e?.message || "")) {
    return "Se cortó la conexión antes de que llegara la respuesta. Revisá internet y reintentá.";
  }
  return e?.message || "Algo falló del lado del servidor. Reintentá en un momento.";
};

const reducirMovimiento = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

export const DRAFT_KEY = "novaia_draft";

export default function Chat({ auth, convId, go }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState(leerBorrador);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  // Perro guardián: si a los 18s no llegó ni un token, se lo decimos en vez de
  // dejar la pantalla "pensando" indefinidamente; a los 45s cortamos el fetch.
  const [lento, setLento] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [recordando, setRecordando] = useState(null);
  const [recordado, setRecordado] = useState(null);
  const [conv, setConv] = useState(convId ? Number(convId) : null);
  const [guest, setGuest] = useState(leerGuest);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [agent, setAgent] = useState(leerAgente);
  const [agentBlock, setAgentBlock] = useState(false);
  const [modelos, setModelos] = useState([]);
  const [cuota, setCuota] = useState(null);
  const asientoRef = useRef(null);
  const totalRef = useRef(0);
  const cuotaRef = useRef(null);
  const [prefs] = useState(leerPrefs);
  const [modelKey, setModelKey] = useState(prefs.modelo || "flash");
  const endRef = useRef(null);
  const taRef = useRef(null);
  const loadedRef = useRef(false);
  const accRef = useRef("");
  const rafRef = useRef(0);
  // Piezas del canvas: lo que Nova produjo listo para copiar o descargar.
  const [piezas, setPiezas] = useState([]);
  const [indicePieza, setIndicePieza] = useState(0);
  const [canvasAbierto, setCanvasAbierto] = useState(false);
  const vivaRef = useRef(-1);
  // Detener: el usuario corta el stream y se queda con lo que llegó.
  const controlRef = useRef(null);
  const detenidoRef = useRef(false);
  const [lejos, setLejos] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerBtnRef = useRef(null);
  // Lo que se anuncia a lectores de pantalla: el hilo no es "live" para no
  // dictar cada token; acá se avisa el arranque, la demora y el final.
  const [aviso, setAviso] = useState("");
  const [cargandoConv, setCargandoConv] = useState(Boolean(convId && auth));
  const forzarScrollRef = useRef(false);

  // Botón explícito: cualquier respuesta se puede subir a la pieza sin que el
  // heuristic decida por el usuario. Toma el pedido anterior como título.
  function abrirPieza(texto, idx) {
    const pedido = [...msgs].slice(0, idx).reverse().find((m) => m.role === "user")?.content || "";
    const p = piezaDe(texto, agent?.id, pedido) || { kind: "text", lang: "", body: (texto || "").trim() };
    vivaRef.current = -1;
    const nuevo = piezas.length;
    setPiezas((prev) => [...prev, { pieza: p, titulo: tituloDe(pedido) }]);
    setIndicePieza(nuevo);
    setCanvasAbierto(true);
  }

  const tituloDe = (texto) => (texto || "").replace(/\s+/g, " ").trim().slice(0, 60);

  // Se llama durante el stream: la primera vez que la respuesta parece un
  // entregable se crea la pieza y se va actualizando mientras se escribe.
  function actualizarPieza(texto, titulo, pedido) {
    const p = piezaDe(texto, agent?.id, pedido);
    if (!p) return;
    const i = vivaRef.current;
    if (i >= 0) {
      setPiezas((prev) => prev.map((x, k) => (k === i ? { pieza: p, titulo } : x)));
      return;
    }
    const nuevo = piezas.length;
    vivaRef.current = nuevo;
    setPiezas((prev) => [...prev, { pieza: p, titulo }]);
    setIndicePieza(nuevo);
    setCanvasAbierto(true);
  }

  // Saldo por modelo: lo define el servidor según el plan real de la cuenta.
  const cargarModelos = React.useCallback(async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    try {
      const r = await fetch(`/api/usage?from=${hoy.slice(0, 8)}01&to=${hoy}`);
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d.modelos)) setModelos(d.modelos);
      if (d.cuota) setCuota(d.cuota);
      totalRef.current = d.total || 0;
      if (d.cuota) cuotaRef.current = d.cuota;
    } catch {
      /* sin datos, el chip queda en modo simple */
    }
  }, [auth?.id]);

  useEffect(() => {
    cargarModelos();
  }, [cargarModelos]);

  // El composer crece con el texto, hasta un límite cómodo
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  // Abrir una conversación guardada (desde Historial: #/chat/12)
  useEffect(() => {
    if (!convId || !auth || loadedRef.current) return;
    loadedRef.current = true;
    setCargandoConv(true);
    (async () => {
      try {
        const res = await fetch(`/api/history?conv_id=${convId}`);
        if (!res.ok) {
          showToast(
            res.status === 404
              ? "No encontramos esa conversación. Arrancá una nueva."
              : "No pudimos abrir la conversación. Probá recargar.",
            { tone: "error" }
          );
          return;
        }
        const data = await res.json();
        setConv(data.conversation.id);
        forzarScrollRef.current = true;
        setMsgs(data.messages.map((m) => ({ role: m.role, content: m.content })));
      } catch {
        showToast("Sin conexión: no pudimos abrir la conversación.", { tone: "error" });
      } finally {
        setCargandoConv(false);
      }
    })();
  }, [convId, auth?.id]);

  // Auto-scroll solo si el usuario está mirando el final de la conversación,
  // salvo al mandar o abrir una charla: ahí siempre se baja al último mensaje.
  useEffect(() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 260;
    if (nearBottom || forzarScrollRef.current) endRef.current?.scrollIntoView({ block: "end", behavior: "instant" });
    forzarScrollRef.current = false;
  }, [msgs]);

  // En desktop el cursor ya espera en el composer; en táctil no se abre el teclado solo.
  useEffect(() => {
    try {
      if (window.matchMedia("(pointer: fine)").matches) taRef.current?.focus({ preventScroll: true });
    } catch {
      /* sin matchMedia */
    }
  }, []);

  // Guarda un mensaje en D1 (si hay sesión). Devuelve el id de conversación a usar.
  async function save(role, content, convOverride) {
    const target = convOverride ?? conv;
    if (!auth) return target;
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conv_id: target, role, content }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.conversation_id) {
        setConv(data.conversation_id);
        // Conversación nueva: la barra lateral la suma a Recientes y la URL la
        // apunta, así recargar no la pierde.
        if (!target) {
          window.dispatchEvent(new Event("novaia:historial"));
          history.replaceState(null, "", `#/chat/${data.conversation_id}`);
        }
      }
      return data?.conversation_id ?? target;
    } catch {
      return target;
    }
  }

  function flushAcc() {
    const chunk = accRef.current;
    accRef.current = "";
    if (!chunk) return;
    setMsgs((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") {
        copy[copy.length - 1] = { ...last, content: (last.content || "") + chunk };
      }
      return copy;
    });
  }

  function pushDelta(delta) {
    accRef.current += delta;
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        flushAcc();
      });
    }
  }

  async function send(text, { reintento = false } = {}) {
    const content = text.trim();
    if (!content || busy) return;

    if (!auth && guest.n >= GUEST_LIMIT) {
      setLoginPrompt(true);
      return;
    }

    // Reintento: el pedido ya está en pantalla (y guardado); se descarta la
    // respuesta fallida y se vuelve a pedir sin duplicar el mensaje.
    const previos = reintento ? msgs.slice(0, -2) : msgs;
    const history = [...previos, { role: "user", content }];
    // La burbuja vacia se pinta ANTES de pedir: el backend tarda entre 3 y 14
    // segundos en el primer token, y sin esto el usuario mira una pantalla quieta.
    forzarScrollRef.current = true;
    setMsgs([...history, { role: "assistant", content: "" }]);
    setAviso("Nova está pensando la respuesta.");
    setInput("");
    setBusy(true);
    setWaiting(true);
    setCopiedIdx(null);
    vivaRef.current = -1; // cada respuesta nueva escribe su propia pieza
    setLento(false);
    const titulo = tituloDe(content);
    const control = new AbortController();
    controlRef.current = control;
    detenidoRef.current = false;
    let acc = "";
    let currentConv = conv;
    const relojLento = setTimeout(() => {
      setLento(true);
      setAviso("Está tardando más de lo normal. Podés esperar o detenerla con Escape.");
    }, 18000);
    // El corte de 45 s es solo para el primer token: una respuesta larga que ya
    // está escribiendo no se interrumpe por tiempo.
    const relojCorte = setTimeout(() => control.abort(), 45000);
    let primerToken = false;
    // Si el stream se queda mudo 30 s en el medio, se corta igual.
    let relojSilencio = 0;
    try {
      if (!reintento) currentConv = await save("user", content);
      const res = await fetch("/api/chat", {
        method: "POST",
        signal: control.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          agent: agent?.id,
          model: modelKey,
          prefs: { idioma: prefs.idioma, largo: prefs.largo },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 402 && data.limite) {
          setGuest({ day: hoy(), n: GUEST_LIMIT });
          escribirGuest(GUEST_LIMIT);
          setMsgs(previos); // devolvemos el mensaje que no llegó a procesarse
          setLoginPrompt(true);
          return;
        }
        if (res.status === 403 && data.agentas) {
          try { sessionStorage.removeItem(AGENT_KEY); } catch { /* sin storage */ }
          setAgent(null);
          setMsgs(previos);
          setAgentBlock(true);
          return;
        }
        throw new Error(
          data.error ||
            (res.status === 429
              ? "Hay muchos pedidos juntos. Esperá unos segundos y reintentá."
              : `El servidor respondió con un error (${res.status}). Reintentá en un momento.`)
        );
      }
      if (!auth) {
        const n = Math.min(GUEST_LIMIT, guest.n + 1);
        setGuest({ day: hoy(), n });
        escribirGuest(n);
      }
      // OpenRouter con stream:true responde SSE. Acumulamos por frames para que fluya suave.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let ultSync = 0;
      let fallo = false;
      let evento = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith("event:")) {
            evento = t.slice(6).trim();
            continue;
          }
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            // "event: nova" con error:true es el aviso de que no hubo respuesta
            // del modelo: ese texto no es una pieza del usuario.
            if (evento === "nova") {
              if (json.error) fallo = true;
              // El asiento del libro: qué modelo contestó, cuánto descontó y desde
              // qué upstream. El servidor ya lo mandaba y el frente lo tiraba.
              else asientoRef.current = { model: json.model, tokens: json.tokens, upstream: json.upstream };
              // El saldo del asiento se calcula sobre el total del mes que ya
              // teníamos: el backend todavía no descontó esta respuesta.
              evento = "";
              continue;
            }
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              if (!primerToken) {
                primerToken = true;
                setWaiting(false);
                setLento(false);
                clearTimeout(relojLento);
                clearTimeout(relojCorte);
                setAviso("Nova está escribiendo.");
              }
              clearTimeout(relojSilencio);
              relojSilencio = setTimeout(() => control.abort(), 30000);
              acc += delta;
              pushDelta(delta);
              // Se espeja en el canvas cada ~48 caracteres: alcanza para que se
              // vea escribir y no dispara un render extra por cada token.
              if (!fallo && acc.length - ultSync >= 48) {
                ultSync = acc.length;
                actualizarPieza(acc, titulo, content);
              }
            }
          } catch {
            /* línea parcial, se ignora */
          }
        }
      }
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      flushAcc();
      // Toda respuesta deja asiento, incluso si el evento nova no llegó: si no,
      // el libro deja de cuadrar justo cuando algo salió mal.
      const bruto = asientoRef.current || {};
      asientoRef.current = null;
      const asiento = {
        model: bruto.model || null,
        tokens: bruto.tokens || 0,
        upstream: bruto.upstream || null,
        saldo: auth && bruto.tokens ? Math.max(0, (cuotaRef.current ?? 0) - totalRef.current - bruto.tokens) : null,
        fallo,
      };
      setMsgs((prev) =>
        prev.map((m, k) => (k === prev.length - 1 && m.role === "assistant" ? { ...m, asiento } : m))
      );
      if (acc) {
        if (!fallo) actualizarPieza(acc, titulo, content); // la versión completa, sin recortes del throttle
        vivaRef.current = -1;
        setAviso(
          (fallo ? "No hubo respuesta del modelo. " : `Nova respondió${asiento.model ? " con " + asiento.model : ""}. `) +
            resumenParaLeer(acc)
        );
        await save("assistant", acc, currentConv);
      } else {
        const vacio = "No llegó ninguna respuesta. Reintentá: si pasa dos veces, cambiá de modelo desde el menú de abajo.";
        setMsgs([...history, { role: "assistant", content: vacio, asiento: asientoCorto(true) }]);
        setAviso(vacio);
      }
    } catch (e) {
      // Lo cortó el usuario: queda lo que llegó, con su asiento, y se guarda.
      if (e?.name === "AbortError" && detenidoRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        flushAcc();
        setMsgs((prev) =>
          prev.map((m, k) =>
            k === prev.length - 1 && m.role === "assistant"
              ? { ...m, content: acc, detenida: true, asiento: null }
              : m
          )
        );
        setAviso(acc ? "Detuviste la respuesta. Queda lo que alcanzó a escribir." : "Detuviste la respuesta antes de que empezara.");
        if (acc) await save("assistant", acc, currentConv);
        return;
      }
      const cortado = e?.name === "AbortError";
      const explicacion = cortado
        ? "Tardó demasiado en responder y corté la espera para no dejarte colgado. Probá de nuevo."
        : explicarError(e);
      setMsgs([
        ...history,
        {
          role: "assistant",
          content: explicacion,
          asiento: asientoCorto(true),
        },
      ]);
      setAviso(explicacion);
      showToast(cortado ? "Se cortó la espera. Reintentá." : "No pudimos obtener la respuesta.", { tone: "error" });
    } finally {
      clearTimeout(relojLento);
      clearTimeout(relojCorte);
      clearTimeout(relojSilencio);
      controlRef.current = null;
      setLento(false);
      setBusy(false);
      setWaiting(false);
      // Si el foco estaba en Detener (que desaparece), vuelve al composer.
      requestAnimationFrame(() => {
        const activo = document.activeElement;
        if (!activo || activo === document.body) taRef.current?.focus({ preventScroll: true });
      });
      cargarModelos();
      window.dispatchEvent(new Event("novaia:saldo"));
    }
  }

  // El asiento de un fallo no puede inventar un saldo: sin tokens cobrados y sin
  // cuenta, el número que sigue es el del plan, no el de esta respuesta.
  function asientoCorto(fallo) {
    return { model: null, tokens: 0, upstream: null, saldo: null, fallo: !!fallo };
  }

  function detener() {
    if (!controlRef.current) return;
    detenidoRef.current = true;
    controlRef.current.abort();
  }

  // Esc corta la respuesta en curso, desde cualquier lugar de la pantalla.
  useEffect(() => {
    if (!busy) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !document.querySelector("[aria-modal='true']")) detener();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy]);

  // ¿El usuario se alejó del final? Aparece el botón para volver.
  useEffect(() => {
    const onScroll = () => {
      const falta = document.documentElement.scrollHeight - (window.innerHeight + window.scrollY);
      setLejos(falta > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [msgs.length]);

  function reintentar() {
    const pedido = msgs[msgs.length - 2];
    if (pedido?.role === "user") send(pedido.content, { reintento: true });
  }

  // La charla entera como Markdown, para guardarla o mandarla.
  function exportar() {
    const titulo = tituloDe(msgs.find((m) => m.role === "user")?.content) || "Conversación con Nova";
    const cuerpo = msgs
      .filter((m) => m.content)
      .map((m) => (m.role === "user" ? `## Vos\n\n${m.content}` : `## Nova${m.asiento?.model ? ` (${m.asiento.model})` : ""}\n\n${m.content}`))
      .join("\n\n");
    const texto = `# ${titulo}\n\n${cuerpo}\n`;
    const url = URL.createObjectURL(new Blob([texto], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = (titulo.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, "-").replace(/^-|-$/g, "").slice(0, 50) || "conversacion") + ".md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Descargaste la conversación en Markdown.");
  }

  async function handleCopy(text, i) {
    const ok = await copyText(text);
    if (ok) {
      setCopiedIdx(i);
      setTimeout(() => setCopiedIdx(null), 1600);
    } else {
      showToast("No pudimos copiar la respuesta", { tone: "error" });
    }
  }

  // Guarda el mensaje del usuario en la memoria de Nova. Sin esto, la única
  // forma de alimentar la memoria sería escribir a mano en Ajustes.
  async function handleRecord(text, i) {
    setRecordando(i);
    try {
      const r = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: text }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast(d.error || "No lo pude guardar.", { tone: "error" });
        return;
      }
      setRecordado(i);
      setTimeout(() => setRecordado(null), 1800);
      showToast("Nova va a recordar esto en todas las charlas.");
    } catch {
      showToast("Se cayó la conexión. Probá de nuevo.", { tone: "error" });
    } finally {
      setRecordando(null);
    }
  }

  const conversando = msgs.length > 0;
  const piezaActual = piezas[indicePieza] || null;
  const moverPieza = (delta) => {
    const siguiente = Math.min(piezas.length - 1, Math.max(0, indicePieza + delta));
    setIndicePieza(siguiente);
  };

  const listaModelos = modelos.length ? modelos : [{ key: "flash", label: "Nova Flash", restantes: 0, agotado: false }];
  const modeloActual = listaModelos.find((m) => m.key === modelKey) || listaModelos[0];
  const titulo = tituloDe(msgs.find((m) => m.role === "user")?.content);
  const ultimo = msgs[msgs.length - 1];
  // Se reintenta una respuesta fallida o una que se detuvo antes de escribir nada
  // (esa no quedó guardada, así que no se duplica en el historial).
  const puedeReintentar =
    !busy &&
    ultimo?.role === "assistant" &&
    (ultimo.asiento?.fallo || (ultimo.detenida && !ultimo.content)) &&
    msgs[msgs.length - 2]?.role === "user";

  function irAlFinal() {
    endRef.current?.scrollIntoView({ block: "end", behavior: reducirMovimiento() ? "instant" : "smooth" });
    taRef.current?.focus({ preventScroll: true });
  }

  function cerrarPicker() {
    setPickerOpen(false);
    pickerBtnRef.current?.focus();
  }

  // Flechas, Inicio y Fin recorren los modelos disponibles dentro del menú.
  function navegarPicker(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      cerrarPicker();
      return;
    }
    if (e.key === "Tab") {
      setPickerOpen(false);
      return;
    }
    const opciones = [...e.currentTarget.querySelectorAll("[role='option']:not(:disabled)")];
    if (!opciones.length) return;
    const actual = opciones.indexOf(document.activeElement);
    let sig = null;
    if (e.key === "ArrowDown") sig = (actual + 1) % opciones.length;
    else if (e.key === "ArrowUp") sig = (actual - 1 + opciones.length) % opciones.length;
    else if (e.key === "Home") sig = 0;
    else if (e.key === "End") sig = opciones.length - 1;
    if (sig == null) return;
    e.preventDefault();
    opciones[sig].focus();
  }
  const quedanGuest = Math.max(0, GUEST_LIMIT - guest.n);

  return (
    <>
    <section className={"chat" + (conversando ? "" : " chat-vacio")}>
      {conversando && (
        <header className="chat-head">
          <h1 title={titulo}>{titulo || "Conversación"}</h1>
          <div className="chat-tools">
            {piezas.length > 0 && !canvasAbierto && (
              <button className="btn btn-quiet btn-sm" onClick={() => setCanvasAbierto(true)}>
                <Icon name="doc" size={15} /> {piezas.length === 1 ? "Ver la pieza" : `Ver las ${piezas.length} piezas`}
              </button>
            )}
            <button className="icon-btn" onClick={exportar} disabled={busy} title="Descargar la conversación (.md)" aria-label="Descargar la conversación en Markdown">
              <Icon name="download" size={17} />
            </button>
            <button className="icon-btn" onClick={() => go("chat")} title="Nuevo chat" aria-label="Nuevo chat">
              <Icon name="plusSq" size={17} />
            </button>
          </div>
        </header>
      )}

      {!conversando && cargandoConv && (
        <p className="chat-cargando" role="status">
          <span className="dots" aria-hidden="true"><i /><i /><i /></span>
          Abriendo la conversación…
        </p>
      )}

      {!conversando && !cargandoConv && (
        <div className="chat-intro">
          <h1>{agent ? agent.name : "¿Qué hacemos?"}</h1>
          <p>
            {agent
              ? agent.desc
              : auth
                ? "Escribí abajo o arrancá con una de estas. Cada respuesta te dice qué modelo contestó y cuánto descontó."
                : `Sin cuenta tenés ${GUEST_LIMIT} mensajes por día. Hoy te ${quedanGuest === 1 ? "queda 1" : `quedan ${quedanGuest}`}.`}
          </p>
          <ul className="sugerencias">
            {(agent ? [{ i: agent.icon, t: "Probar con el ejemplo", d: agent.sample }] : SUGGESTIONS).map((s) => (
              <li key={s.t}>
                <button onClick={() => send(s.d)}>
                  <span>
                    <strong>{s.t}</strong>
                    <small>{s.d}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{aviso}</p>

      <div className="chat-log" role="log" aria-live="off" aria-label="Conversación">
        {msgs.map((m, i) => {
          const streaming = busy && i === msgs.length - 1 && m.role === "assistant";
          const isUser = m.role === "user";
          return (
            <article key={i} className={"msg " + (isUser ? "msg-user" : "msg-ai") + (streaming ? " streaming" : "")}>
              <h2 className="sr-only">{isUser ? "Vos" : "Nova"}</h2>
              <div className="msg-body">
                {isUser ? (
                  <p className="msg-text">{m.content}</p>
                ) : streaming && !m.content ? (
                  <span className={"typing" + (waiting ? " thinking" : "")}>
                    <span className="dots" aria-hidden="true"><i /><i /><i /></span>
                    <span className="typing-label">
                      {lento ? "Está tardando más de lo normal…" : waiting ? "Pensando…" : "Escribiendo…"}
                    </span>
                  </span>
                ) : (
                  <Md text={m.content} streaming={streaming} />
                )}
              </div>
              {!isUser && !streaming && (m.asiento || m.detenida) && (
                <p className={"asiento" + (m.asiento?.fallo ? " asiento-fallo" : "")}>
                  {m.detenida ? (
                    <span>{m.content ? "Detuviste esta respuesta." : "Detuviste la respuesta antes de que empezara."}</span>
                  ) : (
                    <>
                      {m.asiento.model && (
                        <span className={"asiento-modelo m-" + (COLOR_MODELO[listaModelos.find((x) => x.label === m.asiento.model)?.key] || "oro")}>
                          {m.asiento.model}
                        </span>
                      )}
                      {m.asiento.upstream && <span>{m.asiento.upstream}</span>}
                      <span className={m.asiento.tokens ? "a-cargo" : ""}>
                        {m.asiento.tokens
                          ? `−${fmt(m.asiento.tokens)} tokens`
                          : m.asiento.fallo
                            ? "Sin cargo: el modelo no respondió"
                            : "Sin cargo registrado"}
                      </span>
                      {m.asiento.saldo != null && <span>Saldo {fmt(m.asiento.saldo)}</span>}
                    </>
                  )}
                </p>
              )}
              {!isUser && !streaming && (m.content || (puedeReintentar && i === msgs.length - 1)) && (
                <div className="msg-actions">
                  {m.content && (
                    <button className="msg-act" onClick={() => handleCopy(m.content, i)}>
                      <Icon name={copiedIdx === i ? "check" : "copy"} size={14} />
                      {copiedIdx === i ? "Copiado" : "Copiar"}
                    </button>
                  )}
                  {m.content && !m.asiento?.fallo && (
                    <button className="msg-act" onClick={() => abrirPieza(m.content, i)} title="Verla aparte, lista para copiar o descargar">
                      <Icon name="doc" size={14} /> Abrir como pieza
                    </button>
                  )}
                  {puedeReintentar && i === msgs.length - 1 && (
                    <button className="msg-act msg-act-fuerte" onClick={reintentar}>
                      <Icon name="refresh" size={14} /> Reintentar
                    </button>
                  )}
                </div>
              )}
              {isUser && auth?.id && !(busy && i === msgs.length - 2) && (
                <div className="msg-actions">
                  <button
                    className="msg-act"
                    onClick={() => handleRecord(m.content, i)}
                    disabled={recordando === i}
                    title="Nova va a tener esto en cuenta en todas tus próximas charlas"
                  >
                    <Icon name={recordado === i ? "check" : "bookmark"} size={14} />
                    {recordado === i ? "Recordado" : recordando === i ? "Guardando…" : "Que Nova lo recuerde"}
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {msgs.length > 0 && <div ref={endRef} />}
      </div>

      <div className="dock">
        {lejos && conversando && (
          <button
            className="al-final"
            onClick={irAlFinal}
            aria-label="Ir al último mensaje"
            title="Ir al último mensaje"
          >
            <Icon name="arrowDown" size={17} />
          </button>
        )}

        {agent && (
          <div className="agent-chip">
            <Icon name={agent.icon} size={14} />
            <span><b>{agent.name}</b> con sus instrucciones activas</span>
            <button
              className="icon-btn"
              aria-label={`Quitar el agente ${agent.name}`}
              onClick={() => {
                try { sessionStorage.removeItem(AGENT_KEY); } catch { /* sin storage */ }
                setAgent(null);
              }}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        )}

        {!auth && guest.n >= GUEST_LIMIT && (
          <div className="guest-bar">
            <span>Se terminaron los {GUEST_LIMIT} mensajes gratis de hoy. Con una cuenta seguís sin tarjeta.</span>
            <button className="btn btn-primary btn-sm" onClick={() => go("login")}>Crear cuenta</button>
          </div>
        )}

        <div className="composer">
          <textarea
            ref={taRef}
            rows={1}
            placeholder={agent ? `Escribile a ${agent.name}` : "Escribí tu mensaje"}
            aria-label="Mensaje para Nova"
            aria-describedby="composer-ayuda"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Con un IME (acentos compuestos, teclados asiáticos) Enter confirma
              // la letra, no manda el mensaje.
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <span id="composer-ayuda" className="sr-only">
            Enter manda, Shift más Enter hace un salto de línea y Escape detiene la respuesta.
          </span>
          <div className="composer-row">
            <div className="picker">
              <button
                ref={pickerBtnRef}
                className={"picker-btn m-" + (COLOR_MODELO[modeloActual.key] || "oro")}
                onClick={() => setPickerOpen((v) => !v)}
                disabled={busy}
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                aria-label={`Modelo: ${modeloActual.label}. Cambiar`}
              >
                <span className="dot" aria-hidden="true" />
                {modeloActual.label}
                <Icon name="chevronDown" size={14} />
              </button>
              {pickerOpen && (
                <>
                  <button className="picker-scrim" tabIndex={-1} aria-label="Cerrar" onClick={() => setPickerOpen(false)} />
                  <ul
                    className="picker-menu"
                    role="listbox"
                    aria-label="Elegir modelo"
                    onKeyDown={navegarPicker}
                  >
                    {listaModelos.map((m) => (
                      <li key={m.key} role="none">
                        <button
                          role="option"
                          aria-selected={m.key === modelKey}
                          disabled={m.agotado}
                          className={"m-" + (COLOR_MODELO[m.key] || "oro") + (m.key === modelKey ? " on" : "")}
                          autoFocus={m.key === modelKey}
                          onClick={() => {
                            setModelKey(m.key);
                            setPickerOpen(false);
                            taRef.current?.focus();
                          }}
                        >
                          <span className="dot" aria-hidden="true" />
                          <span className="pm-t">
                            <strong>{m.label}</strong>
                            {m.desc && <small>{m.desc}</small>}
                          </span>
                          <span className={"pm-saldo" + (m.agotado ? " vacio" : "")}>
                            {m.agotado ? "Agotado" : auth ? fmt(m.restantes) : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            {auth && modeloActual.pct >= 80 && !modeloActual.agotado && (
              <span className="picker-aviso">Te queda {100 - modeloActual.pct}% de este modelo</span>
            )}
            {busy ? (
              <button className="send-btn stop" onClick={detener} aria-label="Detener la respuesta (Escape)" title="Detener (Esc)">
                <Icon name="stop" size={16} />
              </button>
            ) : (
              <button
                className="send-btn"
                disabled={!input.trim()}
                onClick={() => send(input)}
                aria-label="Enviar mensaje"
                title="Enviar (Enter)"
              >
                <Icon name="send" size={17} />
              </button>
            )}
          </div>
        </div>
        <p className="chat-note">Nova puede equivocarse. Revisá lo importante antes de mandarlo.</p>
      </div>

      <Modal
        open={agentBlock}
        onClose={() => setAgentBlock(false)}
        title="Ese agente necesita Plus o Pro"
        footer={
          <div className="modal-cta">
            <button className="btn btn-primary btn-block" onClick={() => { setAgentBlock(false); go("planes"); }}>
              Comparar planes
            </button>
            <button className="btn btn-quiet btn-block" onClick={() => setAgentBlock(false)}>
              Seguir sin el agente
            </button>
          </div>
        }
      >
        <p>
          Te saqué el agente y podés seguir conversando igual. Los {AGENTS.length} mini agentes con
          instrucciones propias vienen con Plus y Pro.
        </p>
      </Modal>

      <Modal
        open={loginPrompt}
        onClose={() => setLoginPrompt(false)}
        title={`Usaste los ${GUEST_LIMIT} mensajes de hoy`}
        footer={
          <div className="modal-cta">
            <button className="btn btn-primary btn-block" onClick={() => { setLoginPrompt(false); go("login"); }}>
              Crear mi cuenta gratis
            </button>
            <button className="btn btn-quiet btn-block" onClick={() => { setLoginPrompt(false); go("planes"); }}>
              Comparar los planes
            </button>
          </div>
        }
      >
        <div className="gm-dots" aria-label={`${Math.min(guest.n, GUEST_LIMIT)} de ${GUEST_LIMIT} usados`}>
          {Array.from({ length: GUEST_LIMIT }, (_, i) => (
            <span key={i} className={i < guest.n ? "used" : ""} />
          ))}
        </div>
        <p>
          Así Nova te deja probarla sin pedirte datos. Con una cuenta gratis el chat no se corta y queda
          guardado:
        </p>
        <ul className="check-list">
          <li>{`${cuota ? fmt(cuota) : "1.000.000"} tokens por mes, sin tarjeta`}</li>
          <li>Historial con búsqueda en cualquier dispositivo</li>
          <li>Una memoria que Nova lee en cada charla</li>
        </ul>
        <p className="modal-note">El cupo de invitado se renueva al cambiar el día.</p>
      </Modal>
    </section>

    {canvasAbierto && piezaActual && (
      <Canvas
        pieza={piezaActual.pieza}
        titulo={piezaActual.titulo}
        indice={indicePieza}
        total={piezas.length}
        vivo={busy}
        onAnterior={() => moverPieza(-1)}
        onSiguiente={() => moverPieza(1)}
        onCerrar={() => setCanvasAbierto(false)}
      />
    )}
    {canvasAbierto && piezaActual && (
      <button
        className="cv-scrim"
        onClick={() => setCanvasAbierto(false)}
        aria-label="Cerrar la pieza"
        tabIndex={-1}
      />
    )}
    </>
  );
}
