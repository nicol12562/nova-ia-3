import React, { useState, useEffect } from "react";
import { Icon } from "../icons.jsx";
import { showToast } from "../ui.jsx";
import { IDIOMAS, LARGOS, leerPrefs, escribirPrefs } from "../data/prefs.js";

export default function Ajustes({ go, auth, setAuth, dark, toggleTheme, mundo = "ledger", setMundo }) {
  const planName = auth?.plan === "plus" ? "Plus" : auth?.plan === "pro" ? "Pro" : "Gratis";
  const [prefs, setPrefs] = useState(leerPrefs);
  const [abierto, setAbierto] = useState(false);

  function cambiar(parche) {
    const next = { ...prefs, ...parche };
    setPrefs(next);
    escribirPrefs(next);
  }

  function logout() {
    localStorage.removeItem("novaia_user");
    setAuth(null);
    // La sesión real está en una cookie HttpOnly: hay que pedirle al server que la tire.
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    go("");
  }

  return (
    <section>
      <h1 className="hero">Ajustes</h1>
      <p className="lede">Configurá tu experiencia en Nova IA.</p>

      <div className="settings-stack">
        <div className="settings-card">
          <div className="head">
            <span className="sq"><Icon name="lock" size={19} /></span>
            <div>
              <h3>Cuenta y privacidad</h3>
              <p>Tu cuenta, tus datos y tus preferencias.</p>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <strong>Perfil</strong>
              <p>{auth ? `${auth.name || "Sin nombre"} · ${auth.email} · Plan ${planName}` : "Nombre visible y datos de la cuenta"}</p>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() =>
                auth
                  ? showToast("La edición de perfil llega pronto. Podés cambiar tu nombre al registrarte.")
                  : go("login")
              }
            >
              {auth ? "Editar perfil" : "Iniciar sesión"} <Icon name="arrowUpRight" size={12} />
            </button>
          </div>

          <div className="settings-row">
            <div>
              <strong>Plan actual</strong>
              <p>{auth ? `Estás en el plan ${planName}.` : "Compará los límites de cada plan."}</p>
            </div>
            <button className="btn btn-ghost" onClick={() => go("planes")}>
              Ver planes <Icon name="arrowUpRight" size={12} />
            </button>
          </div>

          <div className="settings-row">
            <div>
              <strong>Historial de chats</strong>
              <p>Los chats quedan vinculados a tu cuenta.</p>
            </div>
            <button className="btn btn-ghost" onClick={() => go("historial")}>
              Abrir historial <Icon name="arrowUpRight" size={12} />
            </button>
          </div>

          <div className="settings-row prefs-row">
            <div>
              <strong>Preferencias de respuesta</strong>
              <p>
                {IDIOMAS.find((i) => i.id === prefs.idioma)?.label} ·{" "}
                {LARGOS.find((l) => l.id === prefs.largo)?.label}
              </p>
            </div>
            <button
              className="btn btn-ghost"
              aria-expanded={abierto}
              onClick={() => setAbierto((v) => !v)}
            >
              {abierto ? "Ocultar" : "Personalizar"} <Icon name={abierto ? "chevronDown" : "arrowUpRight"} size={12} />
            </button>
          </div>

          {abierto && (
            <div className="prefs-panel">
              <div className="prefs-group">
                <span className="mono-label">IDIOMA DE RESPUESTA</span>
                <div className="opt-row">
                  {IDIOMAS.map((i) => (
                    <button
                      key={i.id}
                      className={"opt" + (prefs.idioma === i.id ? " on" : "")}
                      onClick={() => cambiar({ idioma: i.id })}
                    >
                      <strong>{i.label}</strong>
                      <span>{i.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="prefs-group">
                <span className="mono-label">LARGO DE LA RESPUESTA</span>
                <div className="opt-row">
                  {LARGOS.map((l) => (
                    <button
                      key={l.id}
                      className={"opt" + (prefs.largo === l.id ? " on" : "")}
                      onClick={() => cambiar({ largo: l.id })}
                    >
                      <strong>{l.label}</strong>
                      <span>{l.hint}</span>
                    </button>
                  ))}
                </div>
                <p className="prefs-hint">
                  <Icon name="pulse" size={12} />
                  {` Breve responde más rápido: limita la salida a ${LARGOS.find((l) => l.id === "breve").maxTokens} tokens.`}
                </p>
              </div>

              <div className="prefs-group">
                <span className="mono-label" htmlFor="pref-modelo">MODELO PREFERIDO</span>
                <select
                  id="pref-modelo"
                  className="prefs-select"
                  value={prefs.modelo}
                  onChange={(e) => cambiar({ modelo: e.target.value })}
                >
                  <option value="flash">Nova Flash · el de saldo más grande</option>
                  <option value="pro">Nova Pro · saldo medio, texto y código</option>
                  <option value="pro31">Nova Pro 3.1 · saldo corto, para lo importante</option>
                </select>
                <p className="prefs-hint">
                  Se aplica al abrir el chat; igual lo podés cambiar desde el composer.
                </p>
              </div>
            </div>
          )}

          {auth && (
            <div className="settings-row">
              <div>
                <strong>Sesión</strong>
                <p>Salí de tu cuenta en este dispositivo</p>
              </div>
              <button className="btn btn-ghost" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        <PerfilNegocio auth={auth} go={go} />

        <Memoria auth={auth} go={go} />

        <div className="settings-card">
          <div className="head">
            <span className="sq"><Icon name="sun" size={19} /></span>
            <div>
              <h3>Apariencia</h3>
              <p>Elegí cómo se ve Nova IA.</p>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <strong>Tema de la aplicación</strong>
              <p>Cambiá entre apariencia clara y oscura.</p>
            </div>
            <div className={"seg" + (dark ? " is-dark" : "")} role="group" aria-label="Tema de la aplicación">
              <span className="seg-thumb" aria-hidden="true" />
              <button className={!dark ? "on" : ""} onClick={() => dark && toggleTheme()}>
                <Icon name="sun" size={14} /> Claro
              </button>
              <button className={dark ? "on" : ""} onClick={() => !dark && toggleTheme()}>
                <Icon name="moon" size={14} /> Oscuro
              </button>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <strong>Interfaz</strong>
              <p>
                Nueva: el saldo y los movimientos, como un extracto de cuenta. Clásica: la vista
                anterior, zinc y azul. Se elige una vez y queda guardada en esta PC.
              </p>
            </div>
            <div className={"seg" + (mundo === "clasico" ? " is-dark" : "")} role="group" aria-label="Interfaz de la aplicación">
              <span className="seg-thumb" aria-hidden="true" />
              <button className={mundo === "ledger" ? "on" : ""} onClick={() => setMundo?.("ledger")}>
                <Icon name="pulse" size={14} /> Nueva
              </button>
              <button className={mundo === "clasico" ? "on" : ""} onClick={() => setMundo?.("clasico")}>
                <Icon name="grid" size={14} /> Clásica
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Perfil del negocio. Se guarda como notas de la memoria con un prefijo fijo, así
// el agente de ventas ya sabe qué vendés y cómo respondés sin que el usuario tenga
// que explicarlo en cada mensaje.
const PERFIL = [
  { prefijo: "Mi negocio:", label: "¿Qué vendés?", ph: "Repuestos para camiones, nuevos y usados, en Rosario" },
  { prefijo: "Cómo atiendo:", label: "Tu forma de responder", ph: "Corto y cercano; precio recién cuando confirmo stock" },
  { prefijo: "Precios y entrega:", label: "Seña, envío y tiempos", ph: "50% de seña; envío a cargo del cliente, 3 a 5 días" },
  { prefijo: "Contacto:", label: "Datos del negocio", ph: "WhatsApp 341-XXXXXX, de lunes a viernes 9 a 18" },
];

function PerfilNegocio({ auth, go }) {
  const [campos, setCampos] = useState(() => Object.fromEntries(PERFIL.map((p) => [p.prefijo, ""])));
  const [orig, setOrig] = useState(() => Object.fromEntries(PERFIL.map((p) => [p.prefijo, ""])));
  const [ids, setIds] = useState(() => Object.fromEntries(PERFIL.map((p) => [p.prefijo, null])));
  const [listo, setListo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!auth?.id) return;
    fetch("/api/memories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        const nextCampos = { ...campos };
        const nextIds = { ...ids };
        for (const p of PERFIL) {
          const nota = (d.notas || []).find((n) => (n.note || "").startsWith(p.prefijo));
          nextCampos[p.prefijo] = nota ? nota.note.slice(p.prefijo.length + 1) : "";
          nextIds[p.prefijo] = nota ? nota.id : null;
        }
        setCampos(nextCampos);
        setOrig({ ...nextCampos });
        setIds(nextIds);
        setListo(true);
      })
      .catch(() => setListo(true));
  }, [auth?.id]);

  async function guardar() {
    setGuardando(true);
    const despues = { ...orig };
    try {
      for (const p of PERFIL) {
        const texto = (campos[p.prefijo] || "").trim();
        if (texto === (orig[p.prefijo] || "").trim()) continue; // no tocó este campo
        const viejo = ids[p.prefijo];
        if (!texto) {
          await fetch(`/api/memories?id=${viejo}`, { method: "DELETE" });
          setIds((v) => ({ ...v, [p.prefijo]: null }));
          despues[p.prefijo] = "";
          continue;
        }
        if (viejo) await fetch(`/api/memories?id=${viejo}`, { method: "DELETE" });
        const r = await fetch("/api/memories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: `${p.prefijo} ${texto}` }),
        });
        const d = await r.json().catch(() => ({}));
        setIds((v) => ({ ...v, [p.prefijo]: d.id || null }));
        despues[p.prefijo] = texto;
      }
      setOrig(despues);
      showToast("Nova ya conoce tu negocio.");
    } catch {
      showToast("Se cortó la conexión; probá de nuevo.", { tone: "error" });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="settings-card">
      <div className="head">
        <span className="sq"><Icon name="send" size={19} /></span>
        <div>
          <h3>Perfil del negocio</h3>
          <p>Para que el agente de WhatsApp responda como respondés vos.</p>
        </div>
      </div>

      {!auth ? (
        <div className="settings-row">
          <div>
            <strong>Iniciá sesión para cargarlo</strong>
            <p>Se guarda en tu cuenta y se usa en todas las conversaciones.</p>
          </div>
          <button className="btn btn-ghost" onClick={() => go("login")}>
            Entrar <Icon name="arrowUpRight" size={12} />
          </button>
        </div>
      ) : (
        <>
          {!listo ? (
            <p className="mem-vacio">Cargando…</p>
          ) : (
            <div className="perfil-grid">
              {PERFIL.map((p) => (
                <label key={p.prefijo} className="perfil-campo">
                  <span>{p.label}</span>
                  <textarea
                    rows={2}
                    maxLength={220}
                    value={campos[p.prefijo]}
                    placeholder={p.ph}
                    onChange={(e) => setCampos((v) => ({ ...v, [p.prefijo]: e.target.value }))}
                  />
                </label>
              ))}
              <div className="perfil-foot">
                <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar perfil"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Lo que Nova sabe de vos entre conversaciones. Es la parte del producto que
// mejora con el uso: el mismo modelo de OpenRouter, pero ya enterado de tu
// contexto. Se guarda en D1 y entra al system prompt de cada mensaje.
function Memoria({ auth, go }) {
  const [notas, setNotas] = useState(null);
  const [limite, setLimite] = useState(40);
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);

  function cargar() {
    return fetch("/api/memories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setNotas(d.notas || []);
        if (d.limite) setLimite(d.limite);
      })
      .catch(() => setNotas([]));
  }

  useEffect(() => {
    if (auth?.id) cargar();
    else setNotas(null);
  }, [auth?.id]);

  async function guardar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: t }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        showToast(d.error || "No lo pude guardar.");
        return;
      }
      setTexto("");
      showToast("Listo, Nova va a recordar esto.");
      await cargar();
    } catch {
      showToast("Se cayó la conexión. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function borrar(id) {
    setNotas((ns) => (ns || []).filter((n) => n.id !== id));
    try {
      await fetch(`/api/memories?id=${id}`, { method: "DELETE" });
      await cargar();
    } catch {
      await cargar();
    }
  }

  return (
    <div className="settings-card">
      <div className="head">
        <span className="sq"><Icon name="knot" size={19} /></span>
        <div>
          <h3>Memoria de Nova</h3>
          <p>Datos que Nova usa en todas tus conversaciones, sin que se los repitas.</p>
        </div>
      </div>

      {!auth ? (
        <div className="settings-row">
          <div>
            <strong>Iniciá sesión para activarla</strong>
            <p>La memoria se guarda en tu cuenta y queda entre tus chats.</p>
          </div>
          <button className="btn btn-ghost" onClick={() => go("login")}>
            Entrar <Icon name="arrowUpRight" size={12} />
          </button>
        </div>
      ) : (
        <>
          <form className="mem-form" onSubmit={guardar}>
            <input
              type="text"
              value={texto}
              maxLength={220}
              placeholder="Ej: vendo repuestos en Rosario y escribo para clientes, no para técnicos."
              onChange={(e) => setTexto(e.target.value)}
              aria-label="Nueva nota para la memoria"
            />
            <button className="btn btn-primary" type="submit" disabled={busy || !texto.trim()}>
              Guardar
            </button>
          </form>

          {notas === null ? (
            <p className="mem-vacio">Cargando…</p>
          ) : notas.length === 0 ? (
            <p className="mem-vacio">
              Todavía no guardaste nada. Probá con a qué te dedicás, cómo te gusta que te
              respondan o un dato que cansa repetir.
            </p>
          ) : (
            <ul className="mem-lista">
              {notas.map((n) => (
                <li key={n.id}>
                  <span>{n.note}</span>
                  <button type="button" onClick={() => borrar(n.id)} aria-label="Olvidar esta nota">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {notas && (
            <p className="prefs-hint">
              <Icon name="pulse" size={12} />
              {` ${notas.length} de ${limite} notas. Entran al inicio de cada mensaje que mandás.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}
