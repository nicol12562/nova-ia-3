import React, { useState } from "react";
import { Icon } from "../icons.jsx";
import { showToast } from "../ui.jsx";
import Filete from "../filete.jsx";

export default function Login({ go, setAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Algo salió mal. Probá de nuevo.");
      localStorage.setItem("novaia_user", JSON.stringify(data.user));
      setAuth(data.user);
      showToast(mode === "register" ? "Cuenta creada. Ya podés empezar." : "Sesión iniciada.");
      go("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <button className="wordmark" onClick={() => go("")} aria-label="Nova IA, ir al inicio">novaia</button>
        <div className="login-center">
          <Filete className="login-filete" />
          <h1 className="letrero">Preguntá en criollo.</h1>
          <ul className="login-feats">
            <li>Responde en español rioplatense, con voseo y sin vueltas.</li>
            <li>Cada respuesta dice qué modelo contestó y cuánto saldo te queda.</li>
            <li>Historial con búsqueda y una memoria que Nova lee en cada charla.</li>
            <li>Precios en pesos. Si algo falla, te contesta una persona por WhatsApp.</li>
          </ul>
        </div>
        <p className="login-pie">Hecho en Argentina por una persona.</p>
      </div>

      <div className="login-right">
        <button className="back" onClick={() => go("chat")}>
          Volver al chat
        </button>

        <div className="login-box">
          <h2>{mode === "login" ? "Qué bueno verte de nuevo." : "Creá tu cuenta."}</h2>
          <p className="sub">
            {mode === "login"
              ? "Entrá y seguí donde lo dejaste: el historial y la memoria quedan en tu cuenta."
              : "Después de crearla ya tenés historial guardado, búsqueda y el saldo del mes a la vista."}
          </p>

          <div className="tabs">
            <button
              className={mode === "login" ? "tab active" : "tab"}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Iniciar sesión
            </button>
            <button
              className={mode === "register" ? "tab active" : "tab"}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Crear cuenta
            </button>
          </div>

          <form key={mode} className="auth-form" onSubmit={submit}>
            {mode === "register" && (
              <div className="field">
                <label htmlFor="name">Nombre (opcional)</label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Cómo querés que te llame Nova"
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <div className="pass-wrap">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="pass-toggle"
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPass(!showPass)}
                >
                  <Icon name={showPass ? "eyeOff" : "eye"} size={17} />
                </button>
              </div>
            </div>
            {error && <p className="error">{error}</p>}

            <p className="forgot">
              <button
                type="button"
                className="linklike"
                style={{ fontWeight: 500 }}
                onClick={() => showToast("Todavía no hay recuperación por email. Si no recordás la contraseña, creá otra cuenta o escribinos por WhatsApp.")}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </p>

            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner" /> Un segundo…
                </>
              ) : mode === "login" ? (
                "Iniciar sesión"
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>

          <div className="divider">o continuar con</div>

          <button
            className="btn-google"
            onClick={() => {
              window.location.href = "/api/auth/google/start";
            }}
          >
            <Icon name="google" size={17} /> Continuar con Google
          </button>

          <p className="legal">
            Al continuar aceptás los{" "}
            <a href="/terminos.html" target="_blank" rel="noopener noreferrer">Términos</a>. Guardamos
            lo justo para la cuenta, el historial y los límites del plan; cada mensaje se procesa con
            modelos de terceros a través de OpenRouter. Está explicado en{" "}
            <a href="/privacidad.html" target="_blank" rel="noopener noreferrer">Privacidad</a>.
          </p>

          <p className="login-swap">
            {mode === "login" ? (
              <>
                ¿Todavía no tenés cuenta?{" "}
                <button className="linklike" onClick={() => { setMode("register"); setError(""); }}>
                  Crear una cuenta
                </button>
              </>
            ) : (
              <>
                ¿Ya tenés cuenta?{" "}
                <button className="linklike" onClick={() => { setMode("login"); setError(""); }}>
                  Iniciar sesión
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
