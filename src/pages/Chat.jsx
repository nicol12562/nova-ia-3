import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../icons.jsx";
import Md from "../md.jsx";
import Canvas from "../canvas.jsx";
import { piezaDe } from "../piece.js";
import { copyText, showToast, spotlight, Modal } from "../ui.jsx";
import { AGENTS, AGENT_KEY } from "../data/agents.js";
import { leerPrefs } from "../data/prefs.js";

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
  { i: "doc", t: "Escribí algo", d: "Ayudame a escribir un texto claro y convincente" },
  { i: "wand", t: "Dame ideas", d: "Dame 5 ideas creativas para un proyecto nuevo" },
  { i: "knot", t: "Explicame", d: "Explicame un tema difícil de forma sencilla" },
  { i: "bot", t: "Programá conmigo", d: "Ayudame a planificar una pequeña aplicación web" },
];

const fmt = (n) => Math.round(n || 0).toLocaleString("es-AR");

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
  const [dias, setDias] = useState([]);
  const [totalMes, setTotalMes] = useState(0);
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
      setDias(Array.isArray(d.days) ? d.days : []);
      setTotalMes(d.total || 0);
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
    (async () => {
      try {
        const res = await fetch(`/api/history?conv_id=${convId}`);
        if (!res.ok) return;
        const data = await res.json();
        setConv(data.conversation.id);
        setMsgs(data.messages.map((m) => ({ role: m.role, content: m.content })));
      } catch {
        /* sin conexión: arranca vacío */
      }
    })();
  }, [convId, auth?.id]);

  // Auto-scroll solo si el usuario está mirando el final de la conversación
  useEffect(() => {
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 260;
    if (nearBottom) endRef.current?.scrollIntoView({ block: "end", behavior: "instant" });
  }, [msgs]);

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
      if (data?.conversation_id) setConv(data.conversation_id);
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

  async function send(text) {
    const content = text.trim();
    if (!content || busy) return;

    if (!auth && guest.n >= GUEST_LIMIT) {
      setLoginPrompt(true);
      return;
    }

    const history = [...msgs, { role: "user", content }];
    // La burbuja vacia se pinta ANTES de pedir: el backend tarda entre 3 y 14
    // segundos en el primer token, y sin esto el usuario mira una pantalla quieta.
    setMsgs([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setWaiting(true);
    setCopiedIdx(null);
    vivaRef.current = -1; // cada respuesta nueva escribe su propia pieza
    setLento(false);
    const titulo = tituloDe(content);
    const control = new AbortController();
    const relojLento = setTimeout(() => setLento(true), 18000);
    const relojCorte = setTimeout(() => control.abort(), 45000);
    try {
      const currentConv = await save("user", content);
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
          setMsgs(msgs); // devolvemos el mensaje que no llegó a procesarse
          setLoginPrompt(true);
          return;
        }
        if (res.status === 403 && data.agentas) {
          try { sessionStorage.removeItem(AGENT_KEY); } catch { /* sin storage */ }
          setAgent(null);
          setMsgs(msgs);
          setAgentBlock(true);
          return;
        }
        throw new Error(data.error || "El backend respondió " + res.status);
      }
      if (!auth) {
        const n = Math.min(GUEST_LIMIT, guest.n + 1);
        setGuest({ day: hoy(), n });
        escribirGuest(n);
      }
      // OpenRouter con stream:true responde SSE. Acumulamos por frames para que fluya suave.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
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
              if (waiting) setWaiting(false);
              clearTimeout(relojLento);
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
        await save("assistant", acc, currentConv);
      } else {
        setMsgs([...history, { role: "assistant", content: "No llegó ninguna respuesta. Reintentá: si pasa dos veces, cambiá de modelo desde el menú de abajo.", asiento: asientoCorto(fallo) }]);
      }
    } catch (e) {
      const cortado = e?.name === "AbortError";
      setMsgs([
        ...history,
        {
          role: "assistant",
          content: cortado
            ? "Tardó demasiado en responder y corté la espera para no dejarte colgado. Probá de nuevo."
            : "Error: " + e.message,
          asiento: asientoCorto(true),
        },
      ]);
      showToast(cortado ? "Se cortó la espera. Reintentá." : "No pudimos obtener la respuesta.", { tone: "error" });
    } finally {
      clearTimeout(relojLento);
      clearTimeout(relojCorte);
      setLento(false);
      setBusy(false);
      setWaiting(false);
      cargarModelos();
    }
  }

  // El asiento de un fallo no puede inventar un saldo: sin tokens cobrados y sin
  // cuenta, el número que sigue es el del plan, no el de esta respuesta.
  function asientoCorto(fallo) {
    return { model: null, tokens: 0, upstream: null, saldo: null, fallo: !!fallo };
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

  const planName = auth?.plan === "pro" ? "Pro" : auth?.plan === "plus" ? "Plus" : "Gratis";
  const cuotaMes = cuota ?? 1000000;
  const restantePlan = Math.max(0, cuotaMes - (auth ? totalMes : 0));
  // Fecha sin Date→locale: "2026-11-08" renderizado en GMT-3 da 07/11. El ciclo
  // de cuota es calendario, así que se arma el dd/mm a mano desde la cadena.
  const diaEs = (iso) => (iso || "").slice(8, 10) + "/" + (iso || "").slice(5, 7);
  // "ahora", no "hoy": el módulo ya tiene una función hoy() que usa el límite
  // de invitado, y taparla con un Date rompía cada envío sin sesión.
  const ahora = new Date();
  const renuevaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1);
  const renueva =
    String(renuevaMes.getDate()).padStart(2, "0") + "/" + String(renuevaMes.getMonth() + 1).padStart(2, "0");
  // Saldo corrido sobre TODOS los días del mes; se muestran los últimos 8,
  // del más reciente al más viejo.
  const movimientos = (() => {
    let usado = 0;
    return dias
      .map((r) => {
        const cargo = (r.tokens_in || 0) + (r.tokens_out || 0);
        usado += cargo;
        return { day: r.day, cargo, saldo: Math.max(0, cuotaMes - usado) };
      })
      .slice(-8)
      .reverse();
  })();

  return (
    <>
    <div className="chat-lg">
    <section className="chat">
      <div className="banda-venc">
        {auth ? (
          <>
            <span><b>Plan {planName}</b> · renueva {renueva}</span>
            <span className="bv-derecha">
              <span className="bv-cifra">{fmt(restantePlan)} de {fmt(cuotaMes)} tokens</span>
            </span>
          </>
        ) : (
          <>
            <span><b>Sin cuenta</b> · {GUEST_LIMIT} mensajes por día, sin tarjeta</span>
            <span className="bv-derecha">
              <span className="bv-cifra">te quedan {Math.max(0, GUEST_LIMIT - guest.n)} hoy</span>
            </span>
          </>
        )}
      </div>
      {conversando && (
        <div className="chat-topline">
          <span>Conversación</span>
          <div className="tl-actions">
            {piezas.length > 0 && !canvasAbierto && (
              <button className="btn-plain" onClick={() => setCanvasAbierto(true)}>
                <Icon name="doc" size={14} /> Ver {piezas.length === 1 ? "la pieza" : `las ${piezas.length} piezas`}
              </button>
            )}
            <button className="btn-plain" onClick={() => go("chat")}>
              <Icon name="plusSq" size={14} /> Nuevo chat
            </button>
          </div>
        </div>
      )}

      {msgs.length === 0 && (
        <div className="sugerencias">
          {SUGGESTIONS.map((s) => (
            <button key={s.t} className="sugerencia" onClick={() => send(s.d)}>
              <span className="sg-t">{s.t}</span>
              <span className="sg-d">{s.d}</span>
            </button>
          ))}
        </div>
      )}

      <div className="chat-log" role="log" aria-live="polite">
        {msgs.map((m, i) => {
          const streaming = busy && i === msgs.length - 1 && m.role === "assistant";
          const isUser = m.role === "user";
          return (
            <div key={i} className={"msg-row " + (isUser ? "row-user" : "row-ai") + (streaming ? " streaming" : "")}>
              {!isUser && (
                <span className="msg-ava mono" aria-hidden="true">
                  n
                </span>
              )}
              <div className={"msg-bubble " + (isUser ? "bubble-user" : "bubble-ai")}>
                {isUser ? (
                  <span className="msg-text">{m.content}</span>
                ) : streaming && !m.content ? (
                  <span className={"typing" + (waiting ? " thinking" : "")}>
                    <span className="dots" aria-hidden="true"><i /><i /><i /></span>
                    <span className="typing-label" aria-live="polite">
                      {lento
                        ? "Está tardando más de lo normal…"
                        : waiting ? "Nova está pensando…" : "Escribiendo…"}
                    </span>
                  </span>
                ) : (
                  <Md text={m.content} streaming={streaming} />
                )}
                {!isUser && !streaming && m.asiento && (
                  <div className="asiento">
                    <span className={m.asiento.tokens ? "a-cargo" : "a-neutro"}>
                      {m.asiento.tokens
                        ? `−${fmt(m.asiento.tokens)} tokens${m.asiento.saldo != null ? ` · saldo ${fmt(m.asiento.saldo)}` : ""}`
                        : m.asiento.fallo
                          ? "sin cargo: no hubo respuesta del modelo"
                          : "sin cargo registrado"}
                    </span>
                    <span>
                      {m.asiento.model || "sin modelo"}
                      {m.asiento.upstream ? ` · ${m.asiento.upstream}` : ""}
                    </span>
                  </div>
                )}
              </div>
              {!isUser && !streaming && m.content && (
                <div className="msg-actions">
                  <button className="msg-act" onClick={() => handleCopy(m.content, i)}>
                    <Icon name={copiedIdx === i ? "check" : "copy"} size={13} />
                    {copiedIdx === i ? "Copiado" : "Copiar"}
                  </button>
                  <button
                    className="msg-act"
                    onClick={() => abrirPieza(m.content, i)}
                    title="Ver esto en el panel, listo para copiar o descargar"
                  >
                    <Icon name="doc" size={13} /> Abrir en la pieza
                  </button>
                </div>
              )}
              {isUser && !streaming && auth?.id && (
                <div className="msg-actions">
                  <button
                    className="msg-act"
                    onClick={() => handleRecord(m.content, i)}
                    disabled={recordando === i}
                    title="Nova va a usar esto en todas tus próximas charlas"
                  >
                    <Icon name={recordado === i ? "check" : "knot"} size={13} />
                    {recordado === i ? "Recordado" : recordando === i ? "Guardando…" : "Que Nova lo recuerde"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {msgs.length > 0 && <div ref={endRef} />}
      </div>

      {agent && (
        <div className="agent-chip">
          <span className="ac-ico"><Icon name={agent.icon} size={13} /></span>
          <span className="ac-name">{agent.name}</span>
          <span className="ac-hint">instrucciones del agente activas</span>
          <button
            className="ac-x"
            aria-label={`Quitar el agente ${agent.name}`}
            onClick={() => {
              try { sessionStorage.removeItem(AGENT_KEY); } catch { /* sin storage */ }
              setAgent(null);
            }}
          >
            <Icon name="x" size={13} />
          </button>
        </div>
      )}

      {!auth && (
        <div className={"guest-bar" + (guest.n >= GUEST_LIMIT ? " out" : "")}>
          <span className="tag">SIN SESIÓN</span>
          <span className="txt">
            {guest.n >= GUEST_LIMIT ? (
              <>Se acabaron los <b>{GUEST_LIMIT}</b> mensajes gratis de hoy.</>
            ) : (
              <>
                Te quedan <b>{GUEST_LIMIT - guest.n}</b>{" "}
                {GUEST_LIMIT - guest.n === 1 ? "mensaje" : "mensajes"} gratis hoy.
              </>
            )}
          </span>
          <button className="btn btn-primary btn-sm" onClick={() => go("login")}>
            Iniciar sesión
          </button>
        </div>
      )}

      <div className="composer">
        <textarea
          ref={taRef}
          placeholder="Escribí tu mensaje…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <div className="row">
          <div className="model-chip" title="Cada modelo consume su propia bolsa mensual">
            <span className="spark" aria-hidden="true" />
            <select
              value={modelKey}
              onChange={(e) => setModelKey(e.target.value)}
              disabled={busy}
              aria-label="Elegir modelo"
            >
              {(modelos.length ? modelos : [{ key: "flash", label: "Nova Flash", restantes: 0, agotado: false }]).map((m) => (
                <option key={m.key} value={m.key} disabled={m.agotado}>
                  {m.label}
                  {auth ? (m.agotado ? " · agotado" : ` · ${fmt(m.restantes)} restantes`) : ""}
                </option>
              ))}
            </select>
            {auth && modelos.some((m) => m.key === modelKey && m.pct >= 80) && (
              <span className="mc-warn">
                <Icon name="pulse" size={12} />
              </span>
            )}
          </div>
          <span className="send-hint">Enter para enviar</span>
          <button
            className="send-btn"
            disabled={busy || !input.trim()}
            onClick={() => send(input)}
            aria-label="Enviar mensaje"
          >
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
      <p className="chat-note">Nova IA puede equivocarse. Revisá la información importante.</p>

      <Modal
        open={agentBlock}
        onClose={() => setAgentBlock(false)}
        eyebrow="MINI AGENTES"
        title="Ese agente necesita Pro o Plus"
        footer={
          <div className="gm-cta">
            <button className="btn btn-primary btn-block" onClick={() => { setAgentBlock(false); go("planes"); }}>
              <Icon name="crown" size={15} /> Comparar planes
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setAgentBlock(false)}>
              Seguir con Nova normal
            </button>
          </div>
        }
      >
        <p className="gm-copy">
          Te saqué el agente y podés seguir conversando igual. Los {AGENTS.length} mini agentes con
          instrucciones propias vienen con el plan Pro.
        </p>
      </Modal>

      <Modal
        open={loginPrompt}
        onClose={() => setLoginPrompt(false)}
        eyebrow="LÍMITE DE INVITADO"
        title="Probaste los 3 mensajes gratis"
        footer={
          <div className="gm-cta">
            <button className="btn btn-primary btn-block" onClick={() => { setLoginPrompt(false); go("login"); }}>
              <Icon name="arrowUpRight" size={15} /> Crear mi cuenta gratis
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => { setLoginPrompt(false); go("planes"); }}>
              Comparar los planes
            </button>
          </div>
        }
      >
        <div className="gm-meter">
          <div className="gm-dots" aria-hidden="true">
            {Array.from({ length: GUEST_LIMIT }, (_, i) => (
              <span key={i} className={i < guest.n ? "used" : ""} />
            ))}
          </div>
          <span className="gm-count">
            <b>{Math.min(guest.n, GUEST_LIMIT)}</b> / {GUEST_LIMIT} USADOS
          </span>
        </div>

        <p className="gm-copy">
          Así es como Nova te deja probarla sin pedir datos. Con una cuenta el chat no se corta a los
          tres mensajes y queda guardado en tu historial.
        </p>

        <ul className="gm-list">
          <li><span className="tick"><Icon name="check" size={12} /></span> Sin el corte diario de invitado</li>
          <li><span className="tick"><Icon name="check" size={12} /></span> {`${cuota ? fmt(cuota) : "1.000.000"} tokens por mes, sin tarjeta`}</li>
          <li><span className="tick"><Icon name="check" size={12} /></span> Historial, búsqueda y memoria en cualquier dispositivo</li>
        </ul>

        <p className="modal-note">
          El cupo de invitado se renueva al cambiar el día. Si ya tenés cuenta, iniciá sesión y seguís ahora.
        </p>
      </Modal>
    </section>
      <aside className="cuenta" aria-label="Cuenta del mes">
        <h2>{auth ? "Saldo del mes" : "Tu cupo de hoy"}</h2>
        <p className="saldo-hero">{auth ? fmt(restantePlan) : Math.max(0, GUEST_LIMIT - guest.n)}</p>
        <p className="saldo-sub">
          {auth
            ? `de ${fmt(cuotaMes)} tokens · plan ${planName}`
            : `mensajes gratis por día · sin tarjeta. Con cuenta: ${fmt(cuotaMes)} tokens por mes.`}
        </p>

        <h2>{auth ? "Bolsas por modelo" : "Bolsas con una cuenta gratis"}</h2>
        <ul className="bolsas">
          {modelos.map((m) => (
            <li key={m.key}>
              <span className="b-nombre">
                {m.label}
                <span className="b-up">{m.upstream || "OpenRouter"}</span>
              </span>
              <span className={"b-rest" + (m.agotado ? " b-vacia" : "")}>
                {m.agotado ? "agotado" : fmt(m.restantes)}
              </span>
            </li>
          ))}
        </ul>

        <h2>Movimientos</h2>
        {movimientos.length ? (
          <table className="movimientos">
            <caption>Movimientos por día del mes en curso</caption>
            <thead>
              <tr><th>Día</th><th>Cargo</th><th>Saldo</th></tr>
            </thead>
            <tbody>
              {movimientos.map((r) => (
                <tr key={r.day}>
                  <td>{diaEs(r.day)}</td>
                  <td className={r.cargo ? "m-cargo" : "m-vacia"}>{r.cargo ? `−${fmt(r.cargo)}` : "0"}</td>
                  <td>{fmt(r.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="saldo-sub">
            {auth ? "Todavía no hay movimientos este mes." : "Iniciá sesión para ver tus movimientos."}
          </p>
        )}
      </aside>
    </div>

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
