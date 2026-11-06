import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../icons.jsx";
import Md from "../md.jsx";
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
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [conv, setConv] = useState(convId ? Number(convId) : null);
  const [guest, setGuest] = useState(leerGuest);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [agent, setAgent] = useState(leerAgente);
  const [agentBlock, setAgentBlock] = useState(false);
  const [modelos, setModelos] = useState([]);
  const [prefs] = useState(leerPrefs);
  const [modelKey, setModelKey] = useState(prefs.modelo || "flash");
  const endRef = useRef(null);
  const taRef = useRef(null);
  const loadedRef = useRef(false);
  const accRef = useRef("");
  const rafRef = useRef(0);

  // Saldo por modelo: lo define el servidor según el plan real de la cuenta.
  const cargarModelos = React.useCallback(async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    try {
      const r = await fetch(`/api/usage?user_id=${auth?.id || ""}&from=${hoy.slice(0, 8)}01&to=${hoy}`);
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d.modelos)) setModelos(d.modelos);
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
        const res = await fetch(`/api/history?user_id=${auth.id}&conv_id=${convId}`);
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
        body: JSON.stringify({ user_id: auth.id, conv_id: target, role, content }),
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
    try {
      const currentConv = await save("user", content);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          plan: auth?.plan ?? "gratis",
          user_id: auth?.id,
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
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const delta = JSON.parse(payload).choices?.[0]?.delta?.content ?? "";
            if (delta) {
              if (waiting) setWaiting(false);
              acc += delta;
              pushDelta(delta);
            }
          } catch {
            /* línea parcial, se ignora */
          }
        }
      }
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      flushAcc();
      if (acc) {
        await save("assistant", acc, currentConv);
      } else {
        setMsgs([...history, { role: "assistant", content: "(No hubo respuesta del modelo. Probá de nuevo.)" }]);
      }
    } catch (e) {
      setMsgs([...history, { role: "assistant", content: "Error: " + e.message }]);
      showToast("No pudimos obtener la respuesta. Probá de nuevo.", { tone: "error" });
    } finally {
      setBusy(false);
      setWaiting(false);
      cargarModelos();
    }
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

  const conversando = msgs.length > 0;

  return (
    <section className="chat">
      {conversando && (
        <div className="chat-topline">
          <span>Conversación</span>
          <button className="btn-plain" onClick={() => go("chat")}>
            <Icon name="plusSq" size={14} /> Nuevo chat
          </button>
        </div>
      )}

      {!conversando && (
        <div className="chat-hero">
          <p className="eyebrow">
            07 · TU ASISTENTE, A TU MANERA
          </p>
          <h1 className="hero">
            Un espacio para <em>pensar.</em>
          </h1>
          <p className="lede">Ideas, respuestas y proyectos. Empezá por lo que tenés en mente.</p>
        </div>
      )}

      {msgs.length === 0 && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.t}
              className="chip-suggestion spot"
              onPointerMove={spotlight.onPointerMove}
              onClick={() => send(s.d)}
            >
              <span className="sq"><Icon name={s.i} size={17} /></span>
              <span>
                <strong>{s.t}</strong>
                <p>{s.d}</p>
              </span>
              <span className="card-arrow"><Icon name="arrowUpRight" size={15} /></span>
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
                      {waiting ? "Nova está pensando…" : "Escribiendo…"}
                    </span>
                  </span>
                ) : (
                  <Md text={m.content} streaming={streaming} />
                )}
              </div>
              {!isUser && !streaming && m.content && (
                <div className="msg-actions">
                  <button className="msg-act" onClick={() => handleCopy(m.content, i)}>
                    <Icon name={copiedIdx === i ? "check" : "copy"} size={13} />
                    {copiedIdx === i ? "Copiado" : "Copiar"}
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
          Te saqué el agente y podés seguir conversando igual. Los seis mini agentes con instrucciones
          propias vienen con el plan Pro.
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
          Así es como Nova te deja probarla sin pedir datos. Con una cuenta el chat no se corta y
          queda guardado en tu historial.
        </p>

        <ul className="gm-list">
          <li><span className="tick"><Icon name="check" size={12} /></span> Mensajes ilimitados</li>
          <li><span className="tick"><Icon name="check" size={12} /></span> 1.000.000 de tokens por mes</li>
          <li><span className="tick"><Icon name="check" size={12} /></span> Historial en cualquier dispositivo</li>
        </ul>

        <p className="modal-note">
          El cupo de invitado se renueva al cambiar el día. Si ya tenés cuenta, iniciá sesión y seguís ahora.
        </p>
      </Modal>
    </section>
  );
}
