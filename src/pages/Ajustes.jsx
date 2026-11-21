import React, { useState, useEffect, useRef } from "react";
import { Icon } from "../icons.jsx";
import { showToast } from "../ui.jsx";
import { IDIOMAS, LARGOS, MODELOS, leerPrefs, escribirPrefs } from "../data/prefs.js";

const LARGO_NOTA = 220;

export default function Ajustes({ go, auth, setAuth, dark, toggleTheme }) {
  const planName = auth?.plan === "plus" ? "Plus" : auth?.plan === "pro" ? "Pro" : "Gratis";
  const [prefs, setPrefs] = useState(leerPrefs);
  const [abierto, setAbierto] = useState(false);
  // null hasta el primer cambio; después "ok" o "sin-storage".
  const [guardado, setGuardado] = useState(null);
  const [saliendo, setSaliendo] = useState(false);

  function cambiar(parche) {
    const next = { ...prefs, ...parche };
    setPrefs(next);
    setGuardado(escribirPrefs(next) ? "ok" : "sin-storage");
  }

  async function logout() {
    if (saliendo) return;
    setSaliendo(true);
    // La sesión real está en una cookie HttpOnly: hay que pedirle al server que la tire.
    // Si la red falla igual se cierra acá; la cookie vence sola.
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("novaia_user");
    setAuth(null);
    showToast("Cerraste sesión en este dispositivo.");
    go("");
  }

  const idioma = IDIOMAS.find((i) => i.id === prefs.idioma);
  const largo = LARGOS.find((l) => l.id === prefs.largo);
  const modelo = MODELOS.find((m) => m.id === prefs.modelo);

  return (
    <section className="page">
      <header className="page-head">
        <h1>Ajustes</h1>
        <p>Tu cuenta, cómo te responde Nova, qué recuerda de vos y cómo se ve.</p>
      </header>

      <div className="settings-stack">
        <div className="settings-card">
          <div className="head">
            <div>
              <h3>Cuenta y privacidad</h3>
              <p>Tu cuenta, tus datos y tus preferencias.</p>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <strong>Perfil</strong>
              <p>{auth ? `${auth.name || "Sin nombre"}, ${auth.email}. Plan ${planName}.` : "Nombre visible y datos de la cuenta"}</p>
            </div>
            {!auth && (
              <button className="btn btn-quiet" onClick={() => go("login")}>Iniciar sesión</button>
            )}
          </div>

          <div className="settings-row">
            <div>
              <strong>Plan actual</strong>
              <p>{auth ? `Estás en el plan ${planName}.` : "Compará los límites de cada plan."}</p>
            </div>
            <button className="btn btn-quiet" onClick={() => go("planes")}>
              Ver planes
            </button>
          </div>

          <div className="settings-row">
            <div>
              <strong>Historial de chats</strong>
              <p>Los chats quedan vinculados a tu cuenta.</p>
            </div>
            <button className="btn btn-quiet" onClick={() => go("historial")}>
              Abrir historial
            </button>
          </div>

          <div className="settings-row prefs-row">
            <div>
              <strong id="prefs-titulo">Preferencias de respuesta</strong>
              <p>
                {idioma?.label}, {largo?.label.toLowerCase()}, {modelo?.label}
              </p>
            </div>
            <button
              className="btn btn-quiet"
              aria-expanded={abierto}
              aria-controls="prefs-panel"
              onClick={() => setAbierto((v) => !v)}
            >
              {abierto ? "Listo" : "Personalizar"}
            </button>
          </div>

          {abierto && (
            <div className="prefs-panel" id="prefs-panel" aria-labelledby="prefs-titulo">
              <Opciones
                id="pref-idioma"
                titulo="Idioma de la respuesta"
                lista={IDIOMAS}
                valor={prefs.idioma}
                onElegir={(id) => cambiar({ idioma: id })}
              />

              <Opciones
                id="pref-largo"
                titulo="Largo de la respuesta"
                lista={LARGOS}
                valor={prefs.largo}
                onElegir={(id) => cambiar({ largo: id })}
                pie={`Breve responde más rápido: limita la salida a ${LARGOS.find((l) => l.id === "breve").maxTokens} tokens.`}
              />

              <div className="prefs-group">
                <label className="prefs-label" htmlFor="pref-modelo">Modelo preferido</label>
                <select
                  id="pref-modelo"
                  className="prefs-select"
                  value={prefs.modelo}
                  aria-describedby="pref-modelo-hint"
                  onChange={(e) => cambiar({ modelo: e.target.value })}
                >
                  {MODELOS.map((m) => (
                    <option key={m.id} value={m.id}>{`${m.label} · ${m.hint}`}</option>
                  ))}
                </select>
                <p className="prefs-hint" id="pref-modelo-hint">
                  Se aplica al abrir el chat; igual lo podés cambiar desde el composer.
                </p>
              </div>

              <p
                className={"prefs-estado" + (guardado === "sin-storage" ? " is-error" : "")}
                role="status"
              >
                {guardado === "ok" && (
                  <>
                    <Icon name="check" size={16} />
                    Guardado en este dispositivo. Vale desde tu próximo mensaje.
                  </>
                )}
                {guardado === "sin-storage" &&
                  "Tu navegador no dejó guardarlo (¿ventana privada?). Vale hasta que cierres esta pestaña."}
              </p>
            </div>
          )}

          {auth && (
            <div className="settings-row">
              <div>
                <strong>Sesión</strong>
                <p>Salí de tu cuenta en este dispositivo. Tus chats y notas quedan guardados.</p>
              </div>
              <button className="btn btn-quiet" onClick={logout} disabled={saliendo}>
                <Icon name="logout" size={16} />
                {saliendo ? "Saliendo…" : "Cerrar sesión"}
              </button>
            </div>
          )}
        </div>

        <PerfilNegocio auth={auth} go={go} />

        <Memoria auth={auth} go={go} />

        <div className="settings-card">
          <div className="head">
            <div>
              <h3>Apariencia</h3>
              <p>Elegí cómo se ve Nova IA.</p>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <strong id="tema-titulo">Tema de la aplicación</strong>
              <p>Cambiá entre apariencia clara y oscura. Queda guardado en este dispositivo.</p>
            </div>
            <div className={"seg" + (dark ? " is-dark" : "")} role="group" aria-labelledby="tema-titulo">
              <span className="seg-thumb" aria-hidden="true" />
              <button type="button" aria-pressed={!dark} className={!dark ? "on" : ""} onClick={() => dark && toggleTheme()}>
                <Icon name="sun" size={14} /> Claro
              </button>
              <button type="button" aria-pressed={dark} className={dark ? "on" : ""} onClick={() => !dark && toggleTheme()}>
                <Icon name="moon" size={14} /> Oscuro
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Grupo de opciones excluyentes con semántica de radio: Tab entra al elegido y las
// flechas recorren el grupo, como un radio nativo.
function Opciones({ id, titulo, lista, valor, onElegir, pie }) {
  const refs = useRef([]);

  function onKeyDown(e, i) {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const j = (i + delta + lista.length) % lista.length;
    onElegir(lista[j].id);
    refs.current[j]?.focus();
  }

  return (
    <div className="prefs-group">
      <span className="prefs-label" id={`${id}-titulo`}>{titulo}</span>
      <div className="opt-row" role="radiogroup" aria-labelledby={`${id}-titulo`}>
        {lista.map((o, i) => {
          const on = valor === o.id;
          return (
            <button
              key={o.id}
              ref={(el) => (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className={"opt" + (on ? " on" : "")}
              onClick={() => onElegir(o.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <strong>{o.label}</strong>
              <span>{o.hint}</span>
            </button>
          );
        })}
      </div>
      {pie && <p className="prefs-hint">{pie}</p>}
    </div>
  );
}

// Lee el error que manda el backend ({ error }) o arma uno genérico.
async function errorDe(r, fallback) {
  const d = await r.json().catch(() => ({}));
  return d.error || fallback;
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

const esDelPerfil = (nota) => PERFIL.some((p) => (nota || "").startsWith(p.prefijo));
const vacio = (v) => Object.fromEntries(PERFIL.map((p) => [p.prefijo, v]));

function PerfilNegocio({ auth, go }) {
  const [campos, setCampos] = useState(() => vacio(""));
  const [orig, setOrig] = useState(() => vacio(""));
  const [ids, setIds] = useState(() => vacio(null));
  // "cargando" | "listo" | "error"
  const [estado, setEstado] = useState("cargando");
  const [guardando, setGuardando] = useState(false);
  const [recienGuardado, setRecienGuardado] = useState(false);

  function cargar() {
    setEstado("cargando");
    return fetch("/api/memories")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const nextCampos = vacio("");
        const nextIds = vacio(null);
        for (const p of PERFIL) {
          const nota = (d.notas || []).find((n) => (n.note || "").startsWith(p.prefijo));
          nextCampos[p.prefijo] = nota ? nota.note.slice(p.prefijo.length).trim() : "";
          nextIds[p.prefijo] = nota ? nota.id : null;
        }
        setCampos(nextCampos);
        setOrig({ ...nextCampos });
        setIds(nextIds);
        setEstado("listo");
      })
      .catch(() => setEstado("error"));
  }

  useEffect(() => {
    if (auth?.id) cargar();
  }, [auth?.id]);

  const sucio = PERFIL.some((p) => (campos[p.prefijo] || "").trim() !== (orig[p.prefijo] || "").trim());

  async function guardar(e) {
    e.preventDefault();
    if (!sucio || guardando) return;
    setGuardando(true);
    const despues = { ...orig };
    const nextIds = { ...ids };
    try {
      for (const p of PERFIL) {
        const texto = (campos[p.prefijo] || "").trim();
        if (texto === (orig[p.prefijo] || "").trim()) continue; // no tocó este campo
        const viejo = nextIds[p.prefijo];
        if (viejo) {
          const r = await fetch(`/api/memories?id=${viejo}`, { method: "DELETE" });
          if (!r.ok) throw new Error(await errorDe(r, `No pude actualizar "${p.label}".`));
          nextIds[p.prefijo] = null;
          despues[p.prefijo] = "";
        }
        if (!texto) continue;
        const r = await fetch("/api/memories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: `${p.prefijo} ${texto}` }),
        });
        if (!r.ok) throw new Error(await errorDe(r, `No pude guardar "${p.label}".`));
        const d = await r.json().catch(() => ({}));
        nextIds[p.prefijo] = d.id || null;
        despues[p.prefijo] = texto;
      }
      setRecienGuardado(true);
      showToast("Perfil guardado. Nova ya conoce tu negocio.");
    } catch (err) {
      showToast(mensaje(err), { tone: "error" });
    } finally {
      // Lo que llegó a guardarse queda como base, aunque un campo haya fallado.
      setOrig(despues);
      setIds(nextIds);
      setGuardando(false);
    }
  }

  function editar(prefijo, valor) {
    setRecienGuardado(false);
    setCampos((v) => ({ ...v, [prefijo]: valor }));
  }

  return (
    <div className="settings-card">
      <div className="head">
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
          <button className="btn btn-quiet" onClick={() => go("login")}>
            Entrar
          </button>
        </div>
      ) : estado === "cargando" ? (
        <p className="mem-vacio" role="status">Cargando tu perfil…</p>
      ) : estado === "error" ? (
        <div className="settings-row">
          <div>
            <strong>No pude traer tu perfil</strong>
            <p>Puede ser la conexión. Lo que ya guardaste sigue en tu cuenta.</p>
          </div>
          <button className="btn btn-quiet" onClick={cargar}>
            <Icon name="refresh" size={16} /> Reintentar
          </button>
        </div>
      ) : (
        <form className="perfil-grid" onSubmit={guardar}>
          {PERFIL.map((p) => (
            <label key={p.prefijo} className="perfil-campo">
              <span>{p.label}</span>
              <textarea
                rows={2}
                maxLength={LARGO_NOTA - p.prefijo.length - 1}
                value={campos[p.prefijo]}
                placeholder={p.ph}
                onChange={(e) => editar(p.prefijo, e.target.value)}
              />
            </label>
          ))}
          <div className="perfil-foot">
            <p className={"prefs-estado" + (sucio ? " is-pendiente" : "")} role="status">
              {sucio ? (
                "Tenés cambios sin guardar."
              ) : recienGuardado ? (
                <>
                  <Icon name="check" size={16} /> Guardado en tu cuenta.
                </>
              ) : null}
            </p>
            <button className="btn btn-primary" type="submit" disabled={guardando || !sucio}>
              {guardando ? "Guardando…" : "Guardar perfil"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Lo que Nova sabe de vos entre conversaciones. Es la parte del producto que
// mejora con el uso: el mismo modelo de OpenRouter, pero ya enterado de tu
// contexto. Se guarda en D1 y entra al system prompt de cada mensaje.
// Las notas del perfil del negocio también viven acá, pero se editan arriba.
function Memoria({ auth, go }) {
  const [todas, setTodas] = useState(null);
  const [error, setError] = useState(false);
  const [limite, setLimite] = useState(40);
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  const [editando, setEditando] = useState(null); // { id, texto }
  const [ocupada, setOcupada] = useState(null); // id de la nota que se está guardando o borrando
  const [borrada, setBorrada] = useState(null); // { note } para deshacer
  const deshacerTimer = useRef(0);
  const inputRef = useRef(null);

  function cargar() {
    return fetch("/api/memories")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setTodas(d.notas || []);
        setError(false);
        if (d.limite) setLimite(d.limite);
      })
      .catch(() => {
        setError(true);
        setTodas((t) => t ?? []);
      });
  }

  useEffect(() => {
    if (auth?.id) cargar();
    else setTodas(null);
  }, [auth?.id]);

  useEffect(() => () => clearTimeout(deshacerTimer.current), []);

  const notas = (todas || []).filter((n) => !esDelPerfil(n.note));
  const usadas = (todas || []).length;
  const lleno = usadas >= limite;

  async function crear(note) {
    const r = await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    if (!r.ok) throw new Error(await errorDe(r, "No la pude guardar."));
  }

  async function guardar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      await crear(t);
      setTexto("");
      showToast("Listo, Nova va a recordar esto.");
      await cargar();
    } catch (err) {
      showToast(mensaje(err), { tone: "error" });
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  // No hay endpoint para editar: se borra la nota y se crea la nueva. Si la segunda
  // parte falla, se vuelve a crear la original para no perder nada.
  async function guardarEdicion(e) {
    e.preventDefault();
    if (!editando || ocupada) return;
    const nota = notas.find((n) => n.id === editando.id);
    const t = editando.texto.trim();
    if (!nota) return setEditando(null);
    if (!t) return borrar(nota);
    if (t === nota.note) return setEditando(null);
    setOcupada(nota.id);
    try {
      const r = await fetch(`/api/memories?id=${nota.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await errorDe(r, "No la pude cambiar."));
      try {
        await crear(t);
      } catch (err) {
        await crear(nota.note).catch(() => {});
        throw err;
      }
      setEditando(null);
      showToast("Nota actualizada.");
    } catch (err) {
      showToast(mensaje(err), { tone: "error" });
    } finally {
      setOcupada(null);
      await cargar();
    }
  }

  async function borrar(nota) {
    if (ocupada) return;
    setOcupada(nota.id);
    try {
      const r = await fetch(`/api/memories?id=${nota.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await errorDe(r, "No la pude borrar."));
      setTodas((ns) => (ns || []).filter((n) => n.id !== nota.id));
      if (editando?.id === nota.id) setEditando(null);
      clearTimeout(deshacerTimer.current);
      setBorrada({ note: nota.note });
      deshacerTimer.current = window.setTimeout(() => setBorrada(null), 8000);
      await cargar();
    } catch (err) {
      showToast(mensaje(err), { tone: "error" });
    } finally {
      setOcupada(null);
    }
  }

  async function deshacer() {
    if (!borrada) return;
    clearTimeout(deshacerTimer.current);
    const { note } = borrada;
    setBorrada(null);
    try {
      await crear(note);
      showToast("Nota recuperada.");
    } catch (err) {
      showToast(mensaje(err), { tone: "error" });
    } finally {
      await cargar();
    }
  }

  return (
    <div className="settings-card">
      <div className="head">
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
          <button className="btn btn-quiet" onClick={() => go("login")}>
            Entrar
          </button>
        </div>
      ) : (
        <>
          <form className="mem-form" onSubmit={guardar}>
            <label className="prefs-label" htmlFor="mem-nueva">Nueva nota</label>
            <input
              id="mem-nueva"
              ref={inputRef}
              type="text"
              value={texto}
              maxLength={LARGO_NOTA}
              disabled={lleno}
              placeholder="Ej: vendo repuestos en Rosario y escribo para clientes, no para técnicos."
              onChange={(e) => setTexto(e.target.value)}
              aria-describedby="mem-nueva-hint"
            />
            <button className="btn btn-primary" type="submit" disabled={busy || lleno || !texto.trim()}>
              {busy ? "Guardando…" : "Guardar nota"}
            </button>
            <p className="prefs-hint mem-contador" id="mem-nueva-hint">
              {lleno
                ? `Llegaste a las ${limite} notas. Borrá alguna para agregar otra.`
                : texto.length > LARGO_NOTA - 40
                  ? `Te quedan ${LARGO_NOTA - texto.length} caracteres.`
                  : "Una idea por nota: es más fácil de editar después."}
            </p>
          </form>

          {borrada && (
            <div className="mem-deshacer" role="status">
              <span>Nota olvidada.</span>
              <button type="button" className="btn btn-quiet btn-sm" onClick={deshacer}>
                Deshacer
              </button>
            </div>
          )}

          {todas === null ? (
            <p className="mem-vacio" role="status">Cargando tus notas…</p>
          ) : error && todas.length === 0 ? (
            <div className="settings-row">
              <div>
                <strong>No pude traer tus notas</strong>
                <p>Puede ser la conexión. Siguen guardadas en tu cuenta.</p>
              </div>
              <button className="btn btn-quiet" onClick={cargar}>
                <Icon name="refresh" size={16} /> Reintentar
              </button>
            </div>
          ) : notas.length === 0 ? (
            <p className="mem-vacio">
              Todavía no guardaste nada. Probá con a qué te dedicás, cómo te gusta que te
              respondan o un dato que cansa repetir.
            </p>
          ) : (
            <ul className="mem-lista">
              {notas.map((n) =>
                editando?.id === n.id ? (
                  <li key={n.id} className="is-editando">
                    <form className="mem-editar" onSubmit={guardarEdicion}>
                      <input
                        type="text"
                        value={editando.texto}
                        maxLength={LARGO_NOTA}
                        autoFocus
                        aria-label="Editar nota"
                        onChange={(e) => setEditando({ id: n.id, texto: e.target.value })}
                        onKeyDown={(e) => e.key === "Escape" && setEditando(null)}
                      />
                      <button type="submit" className="btn btn-primary btn-sm" disabled={ocupada === n.id}>
                        {ocupada === n.id ? "Guardando…" : "Guardar"}
                      </button>
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditando(null)}>
                        Cancelar
                      </button>
                    </form>
                  </li>
                ) : (
                  <li key={n.id} aria-busy={ocupada === n.id}>
                    <span>{n.note}</span>
                    <div className="mem-acciones">
                      <button
                        type="button"
                        className="btn btn-quiet btn-sm"
                        disabled={!!ocupada}
                        onClick={() => setEditando({ id: n.id, texto: n.note })}
                        aria-label={`Editar: ${n.note}`}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-danger"
                        disabled={!!ocupada}
                        onClick={() => borrar(n)}
                        aria-label={`Olvidar: ${n.note}`}
                        title="Olvidar esta nota"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}

          {todas && !(error && todas.length === 0) && (
            <p className="prefs-hint">
              {`${usadas} de ${limite} notas${usadas > notas.length ? ", contando las del perfil del negocio" : ""}. Entran al inicio de cada mensaje que mandás.`}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function mensaje(err) {
  const m = err?.message || "";
  return m && !/fetch|network/i.test(m) ? m : "Se cayó la conexión. Probá de nuevo.";
}
