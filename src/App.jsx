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
import Palette from "./palette.jsx";
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
  { key: "", label: "Inicio", icon: "home" },
  { key: "historial", label: "Historial", icon: "clock" },
  { key: "mini-agentes", label: "Mini agentes", icon: "cpu" },
  { key: "uso-tokens", label: "Uso y tokens", icon: "pulse" },
  { key: "planes", label: "Planes", icon: "crown" },
];

const QUOTA_FALLBACK = 1000000; // solo mientras responde el backend
const fmt = (n) => Math.round(n).toLocaleString("es-AR");
const esMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");
const MOD = esMac ? "⌘" : "Ctrl";
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
  // En móvil la barra lateral es un diálogo: sin foco atrapado,
  // Tab se escapa a la página que queda detrás del scrim.
  useFocoAtrapado(sheetRef, menuOpen, () => setMenuOpen(false));
  const [paletaOpen, setPaletaOpen] = useState(false);
  const [chats, setChats] = useState([]);
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

  // ⌘K abre la paleta (su primera opción es "Nuevo chat"); ⌘⇧O va directo
  // a un chat nuevo, como en otros asistentes.
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletaOpen((v) => !v);
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        location.hash = "#/chat";
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Chats recientes de la barra lateral. Chat avisa con "novaia:historial"
  // cuando crea una conversación, así aparece sin recargar.
  useEffect(() => {
    if (!auth?.id) {
      setChats([]);
      return;
    }
    let vivo = true;
    const cargar = () =>
      fetch("/api/history")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => vivo && Array.isArray(d) && setChats(d))
        .catch(() => {});
    cargar();
    window.addEventListener("novaia:historial", cargar);
    return () => {
      vivo = false;
      window.removeEventListener("novaia:historial", cargar);
    };
  }, [auth?.id]);

  // Consumo del mes actual (para la tarjeta del plan) y racha de días seguidos.
  useEffect(() => {
    if (!auth) {
      setUsed(null);
      setRacha(0);
      return;
    }
    const cargar = () => {
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
    };
    cargar();
    // Chat avisa al terminar cada respuesta: el saldo de la barra baja en vivo.
    window.addEventListener("novaia:saldo", cargar);
    return () => window.removeEventListener("novaia:saldo", cargar);
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

  // El login es una pantalla completa, sin barra lateral.
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

  const { Comp: View } = VIEWS.find((v) => v.key === base) ?? VIEWS[0];

  const quota = cuota ?? QUOTA_FALLBACK;
  const pct = auth && used != null && quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  const restantes = fmt(Math.max(0, quota - (used ?? 0)));
  const planName = auth?.plan === "plus" ? "Plus" : auth?.plan === "pro" ? "Pro" : "Gratis";
  const inicial = auth ? ((auth.name || auth.email || "N")[0] || "N").toUpperCase() : "?";

  const acciones = [
    { id: "nuevo", label: "Nuevo chat", icon: "plusSq", atajo: `${MOD} ⇧ O`, run: () => go("chat") },
    ...NAV.map((n) => ({ id: "nav-" + n.key, label: n.label, icon: n.icon, run: () => go(n.key) })),
    { id: "ajustes", label: "Ajustes", icon: "sliders", run: () => go("ajustes") },
    { id: "tema", label: dark ? "Pasar a tema claro" : "Pasar a tema oscuro", icon: dark ? "sun" : "moon", run: toggleTheme },
    ...(auth?.role === "admin" ? [{ id: "admin", label: "Panel de control", icon: "lock", run: () => go("admin") }] : []),
    ...(auth ? [] : [{ id: "login", label: "Iniciar sesión o crear cuenta", icon: "logout", run: () => go("login") }]),
  ];

  const recientes = chats.slice(0, 12);
  const convActual = base === "chat" && param ? Number(param) : null;

  return (
    <div className="app">
      <header className="topbar">
        <button className="icon-btn" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}>
          <Icon name="menu" size={20} />
        </button>
        <button className="wordmark" onClick={() => go("")} aria-label="Nova IA, ir al inicio">novaia</button>
        <button className="icon-btn" aria-label="Nuevo chat" onClick={() => go("chat")}>
          <Icon name="plusSq" size={20} />
        </button>
      </header>

      {menuOpen && <button className="side-scrim" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} tabIndex={-1} />}

      <aside
        className={"side" + (menuOpen ? " open" : "")}
        ref={sheetRef}
        aria-label="Navegación"
        {...(menuOpen ? { role: "dialog", "aria-modal": "true", tabIndex: -1 } : {})}
      >
        <div className="side-head">
          <button className="wordmark" onClick={() => go("")} aria-label="Nova IA, ir al inicio">novaia</button>
          <button className="icon-btn side-close" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <button className="side-new" onClick={() => go("chat")}>
          <Icon name="plusSq" size={17} /> Nuevo chat
        </button>
        <button className="side-search" onClick={() => { setMenuOpen(false); setPaletaOpen(true); }}>
          <Icon name="search" size={16} /> Buscar
          <kbd>{MOD} K</kbd>
        </button>

        <nav className="side-nav" aria-label="Secciones">
          {NAV.map((n) => (
            <button
              key={n.key}
              className={"side-link" + (base === n.key ? " on" : "")}
              aria-current={base === n.key ? "page" : undefined}
              onClick={() => go(n.key)}
            >
              <Icon name={n.icon} size={17} /> {n.label}
            </button>
          ))}
        </nav>

        <div className="side-chats">
          {auth ? (
            <>
              <h2 className="side-h">Recientes</h2>
              {recientes.length === 0 ? (
                <p className="side-empty">Tus conversaciones van a aparecer acá.</p>
              ) : (
                <ul>
                  {recientes.map((c) => (
                    <li key={c.id}>
                      <button
                        className={"side-chat" + (convActual === c.id ? " on" : "")}
                        aria-current={convActual === c.id ? "page" : undefined}
                        onClick={() => go(`chat/${c.id}`)}
                        title={c.title}
                      >
                        {!!c.pinned && <Icon name="pin" size={13} />}
                        <span>{c.title || "Sin título"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {chats.length > recientes.length && (
                <button className="side-more" onClick={() => go("historial")}>
                  Ver las {chats.length} conversaciones
                </button>
              )}
            </>
          ) : (
            <p className="side-empty">Con una cuenta, tus charlas quedan guardadas acá.</p>
          )}
        </div>

        <div className="side-foot">
          <button
            className="saldo"
            onClick={() => go(auth ? "uso-tokens" : "planes")}
            title={auth ? "Ver el uso del mes" : "Ver planes y límites"}
          >
            {auth ? (
              <>
                <span className="saldo-t">
                  <b>{restantes}</b> tokens
                  <em>Plan {planName}</em>
                </span>
                <span className="saldo-bar" aria-hidden="true"><i style={{ width: 100 - pct + "%" }} /></span>
                <span className="saldo-sub">quedan de {fmt(quota)} este mes</span>
              </>
            ) : (
              <>
                <span className="saldo-t">
                  <b>{GUEST_LIMIT}</b> mensajes por día
                  <em>Sin cuenta</em>
                </span>
                <span className="saldo-sub">Con cuenta gratis: {fmt(QUOTA_FALLBACK)} tokens por mes</span>
              </>
            )}
          </button>

          <div className="side-user">
            <div className={"user-wrap" + (userMenu ? " open" : "")}>
              <button
                className="user-btn"
                onClick={() => (auth ? setUserMenu((v) => !v) : go("login"))}
                aria-expanded={auth ? userMenu : undefined}
                aria-haspopup={auth ? "menu" : undefined}
              >
                <span className="avatar">{inicial}</span>
                <span className="user-t">
                  <strong>{auth ? auth.name || auth.email : "Iniciar sesión"}</strong>
                  <span>{auth ? (racha >= 2 ? `${racha} días seguidos` : auth.email) : "o crear una cuenta"}</span>
                </span>
              </button>
              {userMenu && auth && (
                <>
                  <button className="user-scrim" onClick={() => setUserMenu(false)} tabIndex={-1} aria-label="Cerrar menú de usuario" />
                  <div className="user-menu" role="menu">
                    <button role="menuitem" onClick={() => go("ajustes")}>
                      <Icon name="sliders" size={15} /> Ajustes
                    </button>
                    <button role="menuitem" onClick={() => go("uso-tokens")}>
                      <Icon name="pulse" size={15} /> Uso y tokens
                    </button>
                    {auth.role === "admin" && (
                      <button role="menuitem" onClick={() => go("admin")}>
                        <Icon name="lock" size={15} /> Panel de control
                      </button>
                    )}
                    <button role="menuitem" className="danger" onClick={logout}>
                      <Icon name="logout" size={15} /> Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
            <button className="icon-btn" title="Cambiar tema" aria-label={dark ? "Pasar a tema claro" : "Pasar a tema oscuro"} onClick={toggleTheme}>
              <Icon name={dark ? "sun" : "moon"} size={17} />
            </button>
            <button className="icon-btn" title="Ayuda y atajos" aria-label="Ayuda y atajos" onClick={() => setHelpOpen(true)}>
              <Icon name="help" size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div className="content">
        <main className={"main" + (base === "chat" ? " main-chat" : "") + (base === "admin" ? " main-wide" : "")}>
          <ErrorBoundary key={base + "/" + (param || "")}>
            {base === "chat" ? (
              <Chat key={param || "nuevo"} go={go} auth={auth} setAuth={setAuth} convId={param || null} />
            ) : (
              <View
                go={go}
                auth={auth}
                setAuth={setAuth}
                dark={dark}
                setDark={setDark}
                toggleTheme={toggleTheme}
                racha={racha}
              />
            )}
          </ErrorBoundary>
        </main>

        {base !== "chat" && (
          <footer className="footer">
            <span>Nova IA, hecha en Argentina por una persona.</span>
            <span className="footer-links">
              <a href="/privacidad.html">Privacidad</a>
              <a href="/terminos.html">Términos</a>
            </span>
          </footer>
        )}
      </div>

      <Palette
        open={paletaOpen}
        onClose={() => setPaletaOpen(false)}
        acciones={acciones}
        chats={chats}
        auth={auth}
        go={go}
      />

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Ayuda y atajos">
        <p>Nova IA está en versión inicial. Si algo no anda, escribinos por WhatsApp desde Planes: contesta una persona.</p>
        <dl className="atajos">
          <div><dt><kbd>{MOD}</kbd><kbd>K</kbd></dt><dd>Buscar pantallas y conversaciones</dd></div>
          <div><dt><kbd>{MOD}</kbd><kbd>⇧</kbd><kbd>O</kbd></dt><dd>Nuevo chat</dd></div>
          <div><dt><kbd>Enter</kbd></dt><dd>Mandar el mensaje</dd></div>
          <div><dt><kbd>⇧</kbd><kbd>Enter</kbd></dt><dd>Salto de línea</dd></div>
          <div><dt><kbd>Esc</kbd></dt><dd>Detener la respuesta mientras se escribe</dd></div>
        </dl>
        <div className="modal-links">
          <button onClick={() => go("planes")}>
            <Icon name="crown" size={16} /> Ver planes y escribir por WhatsApp
          </button>
          <button onClick={() => go("uso-tokens")}>
            <Icon name="pulse" size={16} /> Revisar tu consumo
          </button>
        </div>
      </Modal>

      <Toaster />
    </div>
  );
}
