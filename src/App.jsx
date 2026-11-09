import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Home from "./pages/Home.jsx";
import Planes from "./pages/Planes.jsx";
import Chat, { GUEST_LIMIT } from "./pages/Chat.jsx";
import Login from "./pages/Login.jsx";
import GoogleFinish from "./pages/GoogleFinish.jsx";
import Historial from "./pages/Historial.jsx";
import Agentes from "./pages/Agentes.jsx";
import Uso from "./pages/Uso.jsx";
import Ajustes from "./pages/Ajustes.jsx";
import Admin from "./pages/Admin.jsx";
import { Icon } from "./icons.jsx";
import { Modal, Toaster, useFocoAtrapado } from "./ui.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

const VIEWS = [
  { key: "", title: "Inicio", Comp: Home },
  { key: "planes", title: "Planes de Nova", Comp: Planes },
  { key: "historial", title: "Tu historial", Comp: Historial },
  { key: "mini-agentes", title: "Mini agentes", Comp: Agentes },
  { key: "uso-tokens", title: "Uso y tokens", Comp: Uso },
  { key: "ajustes", title: "Ajustes", Comp: Ajustes },
  { key: "chat", title: "Chat", Comp: Chat },
  { key: "admin", title: "Panel de control", Comp: Admin },
];

const NAV = [
  { key: "", label: "Inicio", icon: "grid" },
  { key: "chat", label: "Nuevo chat", icon: "plusSq" },
  { key: "planes", label: "Planes", icon: "crown" },
  { key: "historial", label: "Historial", icon: "clock" },
  { key: "mini-agentes", label: "Mini agentes", icon: "cpu" },
  { key: "uso-tokens", label: "Uso y tokens", icon: "pulse" },
];

// Riel de la app (mundo "El resumen de cuenta"): solo superficies de tarea.
// Las de persuasión (Inicio, Planes, Login) conservan la barra superior.
const NAV_APP = [
  { key: "chat", label: "Nuevo chat", icon: "plusSq" },
  { key: "historial", label: "Historial", icon: "clock" },
  { key: "mini-agentes", label: "Agentes", icon: "cpu" },
  { key: "uso-tokens", label: "Uso", icon: "pulse" },
  { key: "planes", label: "Planes", icon: "crown" },
  { key: "ajustes", label: "Ajustes", icon: "sliders" },
];
const SUPERFICIE_APP = ["chat", "historial", "mini-agentes", "uso-tokens", "ajustes", "admin"];

const QUOTA_FALLBACK = 1000000; // solo mientras responde el backend
const fmt = (n) => Math.round(n).toLocaleString("es-AR");

export default function App() {
  const [route, setRoute] = useState(() => (location.hash || "#/").replace(/^#\//, ""));
  const [auth, setAuth] = useState(() => {
    try {
      const raw = localStorage.getItem("novaia_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("novaia_theme") === "dark";
    } catch {
      return false;
    }
  });
  const [used, setUsed] = useState(null);
  const [cuota, setCuota] = useState(null);
  const [racha, setRacha] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const sheetRef = useRef(null);
  // La hoja de navegación es un diálogo: sin foco atrapado,
  // Tab se escapa a la página que queda detrás del scrim.
  useFocoAtrapado(sheetRef, menuOpen, () => setMenuOpen(false));
  const [helpOpen, setHelpOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute((location.hash || "#/").replace(/^#\//, ""));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    try {
      localStorage.setItem("novaia_theme", dark ? "dark" : "light");
    } catch {
      /* sin localStorage disponible */
    }
  }, [dark]);

  // Bloquea el scroll del fondo cuando el menú móvil está abierto
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  // Cambio de tema con View Transitions (transitions.dev)
  const toggleTheme = () => {
    const next = !dark;
    if (typeof document !== "undefined" && document.startViewTransition) {
      try {
        document.startViewTransition(() => {
          flushSync(() => setDark(next));
        });
        return;
      } catch {
        /* si el navegador falla, cambiamos sin animación */
      }
    }
    setDark(next);
  };

  // ⌘K / Ctrl+K → nuevo chat
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        location.hash = "#/chat";
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Consumo del mes actual (para la tarjeta del plan) y racha de días seguidos.
  useEffect(() => {
    if (!auth) {
      setUsed(null);
      setRacha(0);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/usage?from=${today.slice(0, 8)}01&to=${today}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setUsed(d.total);
        setRacha(d.racha || 0);
        if (d.cuota) setCuota(d.cuota);
      })
      .catch(() => {});
  }, [auth?.id, auth?.plan]);

  // La cuenta se lee del servidor: si el admin cambia un plan, se ve sin recargar.
  useEffect(() => {
    if (!auth?.id) return;
    const id = auth.id;
    let alive = true;

    const aplicar = (user) => {
      if (!user || user.id !== id) return;
      setAuth((prev) => {
        if (!prev) return prev;
        if (prev.plan === user.plan && prev.role === user.role && prev.name === user.name) return prev;
        const next = { ...prev, ...user };
        localStorage.setItem("novaia_user", JSON.stringify(next));
        return next;
      });
    };

    const refresh = async () => {
      try {
        // Sin user_id: /api/me responde según la cookie de sesión.
        const r = await fetch(`/api/me`, { credentials: "same-origin" });
        if (!r.ok) return;
        const { user } = await r.json();
        if (!alive) return;
        if (!user) {
          // La cookie expiró o se cerró en otra pestaña: la copia de localStorage
          // ya no autoriza nada, así que se va.
          localStorage.removeItem("novaia_user");
          setAuth(null);
          setUsed(null);
          setRacha(0);
          return;
        }
        aplicar(user);
      } catch {
        /* sin respuesta, seguimos con lo que hay */
      }
    };

    // Otra pestaña (el panel) avisó un cambio: se aplica al toque.
    let bc;
    try {
      bc = new BroadcastChannel("novaia");
      bc.onmessage = (e) => {
        if (e.data?.type === "plan") aplicar(e.data.user);
      };
    } catch {
      /* navegadores sin BroadcastChannel: queda el polling */
    }

    refresh();
    const timer = setInterval(refresh, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("hashchange", refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("hashchange", refresh);
      if (bc) bc.close();
    };
  }, [auth?.id]);

  const go = (r) => {
    setMenuOpen(false);
    setHelpOpen(false);
    setUserMenu(false);
    location.hash = r ? `#/${r}` : "#/";
    window.scrollTo(0, 0);
  };

  const logout = () => {
    localStorage.removeItem("novaia_user");
    setAuth(null);
    setUsed(null);
    setRacha(0);
    // Borrar la copia local no cierra nada: la sesión vive en la cookie HttpOnly.
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    go("");
  };

  const [base, param] = route.split("/");

  // El login es una pantalla completa, sin sidebar ni topbar (como en Floot)
  if (base === "login")
    return (
      <ErrorBoundary>
        <Toaster />
        <Login go={go} setAuth={setAuth} />
      </ErrorBoundary>
    );
  if (base === "google")
    return (
      <ErrorBoundary>
        <Toaster />
        <GoogleFinish go={go} setAuth={setAuth} ticket={param} />
      </ErrorBoundary>
    );

  const { title, Comp: View } = VIEWS.find((v) => v.key === base) ?? VIEWS[0];

  const quota = cuota ?? QUOTA_FALLBACK;
  const pct = auth && used != null && quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const restantes = auth ? fmt(Math.max(0, quota - (used ?? 0))) : fmt(quota);
  const planName = auth?.plan === "plus" ? "Plus" : auth?.plan === "pro" ? "Pro" : "Gratis";
  const planLabel = auth ? `Plan ${planName}` : "Sin cuenta";
  const esApp = SUPERFICIE_APP.includes(base);

  // El fondo del body, no el de .app: .app tiene min-height pisado por una regla
  // posterior y dejaba una franja blanca bajo el hilo en 1440x900.
  useEffect(() => {
    document.body.classList.toggle("app-cuenta", esApp);
  }, [esApp]);

  return (
    <div className={"app" + (esApp ? " app-lg" : "")}>
      {esApp ? (
        <aside className="rail" aria-label="Navegación de la app">
          <button className="rail-mark" onClick={() => go("")} aria-label="Nova IA — ir a Inicio">
            <span className="logo-mark" aria-hidden="true">n</span>
            <span className="rail-word">novaia</span>
          </button>
          {NAV_APP.map((n) => (
            <button
              key={n.key}
              className="rail-btn"
              aria-current={base === n.key ? "page" : undefined}
              onClick={() => go(n.key)}
            >
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
              {n.key === "chat" && <span className="kbd-rail">⌘K</span>}
            </button>
          ))}
          {auth?.role === "admin" && (
            <button className="rail-btn" aria-current={base === "admin" ? "page" : undefined} onClick={() => go("admin")}>
              <Icon name="lock" size={18} />
              <span>Panel</span>
            </button>
          )}
          <button className="rail-btn" onClick={toggleTheme} aria-label="Cambiar tema">
            <Icon name={dark ? "moon" : "sun"} size={18} />
            <span>Tema</span>
          </button>
          <div className="rail-foot">
            <span className="rail-saldo">{auth ? restantes : GUEST_LIMIT}</span>
            <span>{auth ? "tokens del mes" : "mensajes por día"}</span>
            {racha > 1 && <span>{racha} días seguidos</span>}
            <button className="rail-aviso" onClick={() => go(auth ? "ajustes" : "login")}>
              {auth ? planLabel : "Crear cuenta gratis"}
            </button>
          </div>
        </aside>
      ) : (
      <header className="topnav">
        <div className="nav-inner">
          <button className="brand" onClick={() => go("")}>
            <span className="logo-mark" aria-hidden="true">n</span>
            <span className="wordmark">
              <b>nova</b>ia
            </span>
          </button>

          <nav className="nav-links" aria-label="Navegación principal">
            {NAV.map((n) => (
              <button
                key={n.key}
                className={"nav-link" + (base === n.key ? " active" : "")}
                onClick={() => go(n.key)}
              >
                {n.label}
                {n.key === "chat" && <span className="kbd">⌘K</span>}
              </button>
            ))}
          </nav>

          <div className="nav-right">
            {!auth && (
              <button className="btn btn-ghost btn-sm" onClick={() => go("login")}>
                Iniciar sesión
              </button>
            )}
            <button className="icon-btn" title="Cambiar tema" aria-label="Cambiar tema" onClick={toggleTheme}>
              <Icon name={dark ? "moon" : "sun"} size={17} />
            </button>
            <button className="help-btn" onClick={() => setHelpOpen(true)}>
              <Icon name="help" size={16} /> <span className="help-txt">Ayuda</span>
            </button>

            <div className={"user-menu-wrap" + (userMenu ? " open" : "")}>
              <button
                className="user-row"
                onClick={() => setUserMenu((v) => !v)}
                aria-expanded={userMenu}
                aria-haspopup="menu"
              >
                <span className="avatar">
                  {auth ? ((auth.name || auth.email || "N")[0] || "N").toUpperCase() : "N"}
                </span>
                <span className="t">
                  <strong>{auth ? auth.name || auth.email : "Invitado"}</strong>
                  <span>{planLabel}</span>
                </span>
                <span className="chev"><Icon name="chevronDown" size={15} /></span>
              </button>
              {userMenu && (
                <>
                  <button className="user-scrim" onClick={() => setUserMenu(false)} tabIndex={-1} aria-label="Cerrar menú de usuario" />
                  <div className="user-menu" role="menu">
                    <div className="plan-card compact">
                      <div className="row">
                        <span className="crown"><Icon name="crown" size={15} /></span>
                        <strong>Plan {planName}</strong>
                        <span className="chip-active" style={{ marginLeft: "auto" }}>ACTIVO</span>
                      </div>
                      <div className="frac"><b>{auth ? fmt(used ?? 0) : "0"} / {fmt(quota)}</b></div>
                      <div className="plan-bar" aria-hidden="true"><span style={{ width: pct + "%" }} /></div>
                      <div className="rest">{auth ? restantes + " tokens restantes" : fmt(quota) + " tokens gratis por mes"}</div>
                    </div>
                    {auth ? (
                      <>
                        <button role="menuitem" onClick={() => { setUserMenu(false); go("ajustes"); }}>
                          <Icon name="sliders" size={14} /> Ajustes
                        </button>
                        <button role="menuitem" onClick={() => { setUserMenu(false); go("uso-tokens"); }}>
                          <Icon name="pulse" size={14} /> Uso y tokens
                        </button>
                        {auth.role === "admin" && (
                          <button role="menuitem" onClick={() => { setUserMenu(false); go("admin"); }}>
                            <Icon name="lock" size={14} /> Panel de control
                          </button>
                        )}
                        <button role="menuitem" className="danger" onClick={logout}>
                          <Icon name="logout" size={14} /> Cerrar sesión
                        </button>
                      </>
                    ) : (
                      <button role="menuitem" onClick={() => { setUserMenu(false); go("login"); }}>
                        <Icon name="logout" size={14} /> Iniciar sesión
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <button className="icon-btn nav-burger" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}>
              <Icon name="menu" size={19} />
            </button>
          </div>
        </div>
      </header>
      )}

      {menuOpen && (
        <>
          <button className="sidebar-scrim open" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />
          <div className="nav-sheet" role="dialog" aria-label="Navegación" aria-modal="true" tabIndex={-1} ref={sheetRef}>
            <div className="sheet-head">
              <span className="mono-label" style={{ margin: 0 }}>NAVEGACIÓN</span>
              <button className="icon-btn" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}>
                <Icon name="x" size={18} />
              </button>
            </div>
            {NAV.map((n) => (
              <button
                key={n.key}
                className={"side-item" + (base === n.key ? " active" : "")}
                onClick={() => { setMenuOpen(false); go(n.key); }}
              >
                <span className="icon"><Icon name={n.icon} size={17} /></span>
                {n.label}
              </button>
            ))}
            <hr className="sheet-sep" />
            <button className={"side-item" + (base === "ajustes" ? " active" : "")} onClick={() => { setMenuOpen(false); go("ajustes"); }}>
              <span className="icon"><Icon name="sliders" size={17} /></span> Ajustes
            </button>
            {auth?.role === "admin" && (
              <button className={"side-item" + (base === "admin" ? " active" : "")} onClick={() => { setMenuOpen(false); go("admin"); }}>
                <span className="icon"><Icon name="lock" size={17} /></span> Panel de control
              </button>
            )}
          </div>
        </>
      )}

      <div className="content">
        <main className={"main" + (base === "chat" ? " main-chat" : "")}>
          <ErrorBoundary key={base + "/" + (param || "")}>
            {base === "chat" ? (
              <Chat key={param || "nuevo"} go={go} auth={auth} setAuth={setAuth} convId={param || null} />
            ) : (
              <View go={go} auth={auth} setAuth={setAuth} dark={dark} setDark={setDark} toggleTheme={toggleTheme} />
            )}
          </ErrorBoundary>
        </main>

        <footer className="footer">
          <span className="brand-foot">novaia</span>
          <span className="mid">
            IA en español, hecha en Argentina.{" "}
            <a href="/privacidad.html">Privacidad</a> · <a href="/terminos.html">Términos</a>
          </span>
          <span>Hecho por una persona · 2026</span>
        </footer>
      </div>

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        eyebrow="SOPORTE"
        title="¿En qué te damos una mano?"
      >
        <p style={{ margin: "0 0 4px" }}>
          Nova IA está en versión inicial. Estos atajos te mueven rápido por la app:
        </p>
        <div className="modal-links">
          <button onClick={() => go("chat")}>
            <Icon name="plusSq" size={16} /> Empezar un chat nuevo <span>⌘ K</span>
          </button>
          <button onClick={() => go("planes")}>
            <Icon name="crown" size={16} /> Ver planes y límites
            <Icon name="arrowUpRight" size={14} style={{ marginLeft: "auto" }} />
          </button>
          <button onClick={() => go("uso-tokens")}>
            <Icon name="pulse" size={16} /> Revisar tu consumo
          </button>
        </div>
        <p className="modal-note">
          Estamos preparando un canal de soporte dentro de la app. Mientras tanto, tus conversaciones
          quedan guardadas en tu cuenta.
        </p>
      </Modal>

      <Toaster />
    </div>
  );
}
