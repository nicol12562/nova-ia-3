import React, { useState } from "react";
import { Icon } from "../icons.jsx";
import { showToast } from "../ui.jsx";

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
      showToast(mode === "register" ? "¡Cuenta creada! Bienvenido a Nova." : "¡Hola de nuevo! Sesión iniciada.");
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
        <div className="brand">
          <span className="logo-mark">
            <Icon name="sparkle" size={16} />
          </span>
          <span className="wordmark">
            <b>nova</b>ia
          </span>
        </div>
        <div className="center">
          <p className="eyebrow">TU ESPACIO CREATIVO</p>
          <h1>
            <span className="line">
              <span className="reveal-word" style={{ "--i": 0 }}>Las</span>{" "}
              <span className="reveal-word" style={{ "--i": 1 }}>buenas</span>{" "}
              <span className="reveal-word" style={{ "--i": 2 }}>ideas</span>
            </span>
            <span className="line">
              <span className="reveal-word" style={{ "--i": 3 }}>empiezan</span>{" "}
              <span className="reveal-word login-em" style={{ "--i": 4 }}>acá.</span>
            </span>
          </h1>
          <p className="lede">
            Un asistente para explorar ideas, resolver problemas y avanzar en lo que estás creando.
          </p>
          <ul className="login-feats">
            <li>
              <Icon name="pulse" size={15} /> Respuestas en vivo, mientras escribís
            </li>
            <li>
              <Icon name="clock" size={15} /> Historial guardado en tu cuenta
            </li>
            <li>
              <Icon name="crown" size={15} /> Tres modelos según tu plan
            </li>
          </ul>
          <hr className="sep" />
          <p className="note">
            <span className="star"><Icon name="sparkle" size={15} /></span>
            <span>
              Menos ruido. Más claridad.
              <br />
              Más cerca de lo que imaginás.
            </span>
          </p>
        </div>
        <p className="minifoot">Nova IA · Hecho para pensar en grande.</p>
      </div>

      <div className="login-right">
        <button className="back" onClick={() => go("chat")}>
          ← Volver al chat
        </button>

        <div className="login-box">
          <p className="eyebrow">QUÉ BUENO VERTE</p>
          <h2>Bienvenido de vuelta.</h2>
          <p className="sub">Entrá a tu espacio y seguí donde lo dejaste.</p>

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
                onClick={() => showToast("La recuperación de contraseña llega en la próxima versión.")}
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
            Al continuar, aceptás usar Nova IA de forma responsable y cuidar la privacidad de tu cuenta.
          </p>

          <p className="login-swap">
            {mode === "login" ? (
              <>
                ¿Todavía no tenés cuenta?{" "}
                <button className="linklike" onClick={() => { setMode("register"); setError(""); }}>
                  Crear una cuenta <Icon name="arrowUpRight" size={13} />
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
