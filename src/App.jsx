import React, { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import Home from "./pages/Home.jsx";
import Planes from "./pages/Planes.jsx";
import Chat from "./pages/Chat.jsx";
import Login from "./pages/Login.jsx";
import GoogleFinish from "./pages/GoogleFinish.jsx";
import Historial from "./pages/Historial.jsx";
import Agentes from "./pages/Agentes.jsx";
import Uso from "./pages/Uso.jsx";
import Ajustes from "./pages/Ajustes.jsx";
import Admin from "./pages/Admin.jsx";
import { Icon } from "./icons.jsx";
import { Modal, Toaster } from "./ui.jsx";
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
  const [menuOpen, setMenuOpen] = useState(false);
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

  // Consumo del mes actual (para la tarjeta del plan)
  useEffect(() => {
    if (!auth) {
      setUsed(null);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/usage?user_id=${auth.id}&from=${today.slice(0, 8)}01&to=${today}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setUsed(d.total);
        if (d.cuota) setCuota(d.cuota);
      })
      .catch(() => {});
  }, [auth?.id]);

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
        const r = await fetch(`/api/me?user_id=${id}`);
        if (!r.ok) return;
        const { user } = await r.json();
        if (alive) aplicar(user);
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

  return (
    <div className="app">
      {menuOpen && (
        <button className="sidebar-scrim" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />
      )}
      <aside className={"sidebar" + (menuOpen ? " open" : "")}>
        <button className="icon-btn sidebar-close" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}>
          <Icon name="x" size={18} />
        </button>
        <button className="brand" onClick={() => go("")}>
          <span className="logo-mark">
            <Icon name="sparkle" size={16} />
          </span>
          <span className="wordmark">
            <b>nova</b>ia
          </span>
        </button>

        <button className="space-card" onClick={() => go("ajustes")}>
          <span className="avatar">N</span>
          <span className="t">
            <strong>Mi espacio</strong>
            <span>Plan {auth?.plan === "plus" ? "Plus" : auth?.plan === "pro" ? "Pro" : "Gratis"}</span>
          </span>
          <span className="chev">
            <Icon name="chevronDown" size={15} />
          </span>
        </button>

        <div className="side-label">ESPACIO DE TRABAJO</div>
        <nav className="side-nav">
          <button className={"side-item" + (base === "" ? " active" : "")} onClick={() => go("")}>
            <span className="icon"><Icon name="grid" size={17} /></span> Inicio
          </button>
          <button className={"side-item" + (base === "chat" ? " active" : "")} onClick={() => go("chat")}>
            <span className="icon"><Icon name="plusSq" size={17} /></span> Nuevo chat
            <span className="kbd">⌘ K</span>
          </button>
          <button className={"side-item" + (base === "planes" ? " active" : "")} onClick={() => go("planes")}>
            <span className="icon"><Icon name="crown" size={17} /></span> Planes
          </button>
          <button className={"side-item" + (base === "historial" ? " active" : "")} onClick={() => go("historial")}>
            <span className="icon"><Icon name="clock" size={17} /></span> Historial
          </button>
          <button className={"side-item" + (base === "mini-agentes" ? " active" : "")} onClick={() => go("mini-agentes")}>
            <span className="icon"><Icon name="cpu" size={17} /></span> Mini agentes
          </button>
          <button className={"side-item" + (base === "uso-tokens" ? " active" : "")} onClick={() => go("uso-tokens")}>
            <span className="icon"><Icon name="pulse" size={17} /></span> Uso y tokens
          </button>
        </nav>

        <div className="side-label">TU CUENTA</div>
        <nav className="side-nav">
          <button className={"side-item" + (base === "ajustes" ? " active" : "")} onClick={() => go("ajustes")}>
            <span className="icon"><Icon name="sliders" size={17} /></span> Ajustes
          </button>
          {auth?.role === "admin" && (
            <button className={"side-item" + (base === "admin" ? " active" : "")} onClick={() => go("admin")}>
              <span className="icon"><Icon name="lock" size={17} /></span> Panel de control
            </button>
          )}
        </nav>

        <div className="plan-card">
          <div className="row">
            <span className="crown"><Icon name="crown" size={16} /></span>
            <strong>Plan {auth?.plan === "plus" ? "Plus" : auth?.plan === "pro" ? "Pro" : "Gratis"}</strong>
            <span className="chip-active" style={{ marginLeft: "auto" }}>ACTIVO</span>
          </div>
          <div className="meta">
            <span>Consumo mensual</span>
            <b>{pct}%</b>
          </div>
          <div className="frac">
            <b>{auth ? fmt(used ?? 0) : "0"} / {fmt(quota)}</b>
          </div>
          <div className="plan-bar" aria-hidden="true">
            <span style={{ width: pct + "%" }} />
          </div>
          <div className="rest">{auth ? `${restantes} tokens restantes` : `${fmt(quota)} tokens gratis por mes`}</div>
          <button className="btn btn-ghost" onClick={() => go("planes")}>
            Conocer los planes <Icon name="arrowUpRight" size={13} />
          </button>
        </div>

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
              <span>{auth ? (auth.plan === "plus" ? "Plan Plus" : auth.plan === "pro" ? "Plan Pro" : "Plan Gratis") : "Iniciar sesión"}</span>
            </span>
            <span className="chev"><Icon name="chevronDown" size={15} /></span>
          </button>
          {userMenu && (
            <>
              <button className="user-scrim" onClick={() => setUserMenu(false)} tabIndex={-1} aria-label="Cerrar menú de usuario" />
              <div className="user-menu" role="menu">
                {auth ? (
                  <>
                    <div className="user-menu-head">
                      <strong>{auth.name || auth.email}</strong>
                      <span>{auth.email}</span>
                    </div>
                    <button role="menuitem" onClick={() => { setUserMenu(false); go("ajustes"); }}>
                      <Icon name="sliders" size={14} /> Ajustes
                    </button>
                    <button role="menuitem" onClick={() => { setUserMenu(false); go("uso-tokens"); }}>
                      <Icon name="pulse" size={14} /> Uso y tokens
                    </button>
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
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="top-left">
            <button className="icon-btn menu-btn" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}>
              <Icon name="menu" size={19} />
            </button>
            <div className="crumbs">
              Nova IA <span>/</span> <b>{title}</b>
            </div>
          </div>
          <div className="top-actions">
            <span className="chip-preview"><span className="dot" /> Vista previa</span>
            {!auth && (
              <button className="btn-top" onClick={() => go("login")}>
                Iniciar sesión <Icon name="arrowUpRight" size={13} />
              </button>
            )}
            <button className="icon-btn" title="Cambiar tema" onClick={toggleTheme}>
              <Icon name={dark ? "moon" : "sun"} size={17} />
            </button>
            <button className="help-btn" onClick={() => setHelpOpen(true)}>
              <Icon name="help" size={16} /> Ayuda
            </button>
          </div>
        </header>

        <main className="main">
          <ErrorBoundary key={base + "/" + (param || "")}>
            {base === "chat" ? (
              <Chat key={param || "nuevo"} go={go} auth={auth} setAuth={setAuth} convId={param || null} />
            ) : (
              <View go={go} auth={auth} setAuth={setAuth} dark={dark} setDark={setDark} toggleTheme={toggleTheme} />
            )}
          </ErrorBoundary>
        </main>

        <footer className="footer">
          <span className="brand-foot">
            <span className="star"><Icon name="sparkle" size={13} /></span> novaia
          </span>
          <span className="mid">
            Un poco más cerca de tus ideas.{" "}
            <a href="/privacidad.html">Privacidad</a> · <a href="/terminos.html">Términos</a>
          </span>
          <span>Edición 01 · 2026</span>
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
