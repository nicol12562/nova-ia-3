import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../icons.jsx";
import { showToast } from "../ui.jsx";
import Filete from "../filete.jsx";

// El servidor exige lo mismo (functions/api/auth.js): se valida antes para no gastar intentos.
const MIN_PASS = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validar(mode, email, password) {
  const errs = {};
  const e = email.trim();
  if (!e) errs.email = "Escribí tu email.";
  else if (!EMAIL_RE.test(e)) errs.email = "Ese email no parece completo. Revisá que tenga @ y el dominio.";
  if (!password) errs.password = mode === "register" ? "Elegí una contraseña." : "Escribí tu contraseña.";
  else if (mode === "register" && password.length < MIN_PASS)
    errs.password = `Necesita al menos ${MIN_PASS} caracteres (van ${password.length}).`;
  return errs;
}

export default function Login({ go, setAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(null); // { text, status }
  const [fieldErrs, setFieldErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const emailRef = useRef(null);
  const passRef = useRef(null);
  const nameRef = useRef(null);
  const firstRender = useRef(true);

  // Al cambiar de pestaña, el foco va al primer campo útil (no en la carga inicial).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    (mode === "register" ? nameRef : emailRef).current?.focus();
  }, [mode]);

  // Volver del ida y vuelta a Google con "Atrás" deja la página en caché: se destraba el botón.
  useEffect(() => {
    const onShow = () => setGoogleBusy(false);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function switchMode(next) {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setFieldErrs({});
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const errs = validar(mode, email, password);
    setFieldErrs(errs);
    if (errs.email) return emailRef.current?.focus();
    if (errs.password) return passRef.current?.focus();

    setBusy(true);
    try {
      let res;
      try {
        res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: mode, name: name.trim(), email: email.trim(), password }),
        });
      } catch {
        throw Object.assign(new Error("No hay conexión con Nova. Revisá internet y probá de nuevo."), { status: 0 });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.user) {
        const fallback =
          res.status >= 500
            ? "El servidor tuvo un problema. Probá de nuevo en un momento."
            : "Algo salió mal. Probá de nuevo.";
        throw Object.assign(new Error(data.error || fallback), { status: res.status });
      }
      try {
        localStorage.setItem("novaia_user", JSON.stringify(data.user));
      } catch {
        /* almacenamiento bloqueado: la sesión sigue en la cookie */
      }
      setAuth(data.user);
      showToast(mode === "register" ? "Cuenta creada. Ya podés empezar." : "Sesión iniciada.");
      go("");
    } catch (err) {
      setError({ text: err.message, status: err.status });
      if (err.status === 401 && mode === "login") passRef.current?.select();
    } finally {
      setBusy(false);
    }
  }

  function startGoogle() {
    if (googleBusy) return;
    setGoogleBusy(true);
    window.location.href = "/api/auth/google/start";
  }

  // Acción concreta para los errores que la tienen.
  let errorAction = null;
  if (error?.status === 409 && mode === "register") {
    errorAction = (
      <button type="button" className="linklike" onClick={() => switchMode("login")}>
        Iniciar sesión con este email
      </button>
    );
  } else if (error?.status === 401 && /Google/.test(error.text)) {
    errorAction = (
      <button type="button" className="linklike" onClick={startGoogle}>
        Continuar con Google
      </button>
    );
  }

  const passHint = mode === "register" ? `Mínimo ${MIN_PASS} caracteres.` : null;
  const passDescribedBy = [fieldErrs.password && "password-err", passHint && "password-hint"].filter(Boolean).join(" ") || undefined;

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

      <main className="login-right">
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

          <div className="tabs" role="tablist" aria-label="Elegí cómo entrar">
            <button
              type="button"
              role="tab"
              id="tab-login"
              aria-selected={mode === "login"}
              aria-controls="auth-form"
              className={mode === "login" ? "tab active" : "tab"}
              onClick={() => switchMode("login")}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              role="tab"
              id="tab-register"
              aria-selected={mode === "register"}
              aria-controls="auth-form"
              className={mode === "register" ? "tab active" : "tab"}
              onClick={() => switchMode("register")}
            >
              Crear cuenta
            </button>
          </div>

          <form
            id="auth-form"
            role="tabpanel"
            aria-labelledby={mode === "login" ? "tab-login" : "tab-register"}
            className="auth-form"
            onSubmit={submit}
            noValidate
            aria-busy={busy}
          >
            {mode === "register" && (
              <div className="field">
                <label htmlFor="name">
                  Nombre <span className="field-opt">(opcional)</span>
                </label>
                <input
                  id="name"
                  ref={nameRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Cómo querés que te llame Nova"
                  autoComplete="name"
                  autoCapitalize="words"
                  maxLength={80}
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                ref={emailRef}
                type="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrs.email) setFieldErrs((f) => ({ ...f, email: undefined }));
                }}
                placeholder="tu@email.com"
                autoComplete={mode === "register" ? "email" : "username"}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={fieldErrs.email ? true : undefined}
                aria-describedby={fieldErrs.email ? "email-err" : undefined}
              />
              {fieldErrs.email && (
                <p className="field-err" id="email-err">
                  {fieldErrs.email}
                </p>
              )}
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <div className="pass-wrap">
                <input
                  id="password"
                  ref={passRef}
                  type={showPass ? "text" : "password"}
                  required
                  minLength={mode === "register" ? MIN_PASS : undefined}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrs.password) setFieldErrs((f) => ({ ...f, password: undefined }));
                  }}
                  placeholder={mode === "register" ? `Al menos ${MIN_PASS} caracteres` : "Tu contraseña"}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={fieldErrs.password ? true : undefined}
                  aria-describedby={passDescribedBy}
                />
                <button
                  type="button"
                  className="pass-toggle"
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPass}
                  aria-controls="password"
                  onClick={() => setShowPass(!showPass)}
                >
                  <Icon name={showPass ? "eyeOff" : "eye"} size={17} />
                </button>
              </div>
              {fieldErrs.password ? (
                <p className="field-err" id="password-err">
                  {fieldErrs.password}
                </p>
              ) : (
                passHint && (
                  <p className="field-hint" id="password-hint">
                    {passHint}
                  </p>
                )
              )}
            </div>

            <div className="auth-error" role="alert" aria-live="assertive">
              {error && (
                <p className="error">
                  {error.text}
                  {errorAction && <> {errorAction}</>}
                </p>
              )}
            </div>

            {mode === "login" && (
              <p className="forgot">
                <button
                  type="button"
                  className="linklike"
                  onClick={() =>
                    showToast(
                      "Todavía no hay recuperación por email. Si no recordás la contraseña, creá otra cuenta o escribinos por WhatsApp."
                    )
                  }
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  {mode === "login" ? "Entrando…" : "Creando tu cuenta…"}
                </>
              ) : mode === "login" ? (
                "Iniciar sesión"
              ) : (
                "Crear cuenta"
              )}
            </button>
          </form>

          <div className="divider">o continuar con</div>

          <button type="button" className="btn-google" onClick={startGoogle} disabled={googleBusy} aria-busy={googleBusy}>
            {googleBusy ? <span className="spinner" aria-hidden="true" /> : <Icon name="google" size={17} />}
            {googleBusy ? "Abriendo Google…" : "Continuar con Google"}
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
                <button type="button" className="linklike" onClick={() => switchMode("register")}>
                  Crear una cuenta
                </button>
              </>
            ) : (
              <>
                ¿Ya tenés cuenta?{" "}
                <button type="button" className="linklike" onClick={() => switchMode("login")}>
                  Iniciar sesión
                </button>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
