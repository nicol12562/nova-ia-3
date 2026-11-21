import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../icons.jsx";

const MOTIVOS = {
  "error-no_config": "Google todavía no está configurado en el servidor (faltan los secretos del cliente OAuth).",
  "error-faltan_datos": "Google no devolvió los datos esperados. Volvé a intentar.",
  "error-estado_invalido": "El intento de acceso venció por seguridad. Volvé a intentar.",
  "error-token_invalido": "No pudimos validar tu identidad con Google. Volvé a intentar.",
  "error-token_vencido": "La sesión de Google venció antes de completar el ingreso. Volvé a intentar.",
  "error-email_no_verificado": "Tu email de Google no está verificado. Verificalo y probá de nuevo.",
  "error-cancelado": "Cancelaste el ingreso con Google. Podés volver a intentar cuando quieras.",
  "error-cliente_invalido": "Google rechazó las credenciales del servidor: el GOOGLE_CLIENT_SECRET cargado en Cloudflare no coincide con el de la consola de Google.",
  "error-codigo_vencido": "El código de Google ya se había usado o venció. Volvé a intentar.",
  "error-redirect_uri": "Google no tiene registrada esta dirección de retorno. Hay que agregarla en la consola de Google.",
  "error-sin_conexion": "El servidor no pudo hablar con Google. Probá de nuevo en un rato.",
  "error-servidor": "Algo falló en el servidor durante el ingreso. Probá de nuevo; si sigue, entrá con email y contraseña.",
  "error-google_admin_policy_enforced": "Tu organización no permite usar Google para entrar a apps externas.",
};

// Errores que no se arreglan reintentando: depende de la configuración o de la organización.
const SIN_REINTENTO = new Set([
  "error-no_config",
  "error-cliente_invalido",
  "error-redirect_uri",
  "error-google_admin_policy_enforced",
]);

function motivoInicial(ticket) {
  if (!ticket) return "Llegaste acá sin un ingreso de Google en curso. Volvé a intentar desde el inicio de sesión.";
  if (ticket.startsWith("error-")) return MOTIVOS[ticket] ?? "No pudimos conectarte con Google.";
  return null;
}

export default function GoogleFinish({ go, setAuth, ticket }) {
  const [error, setError] = useState(() => motivoInicial(ticket));
  const [retrying, setRetrying] = useState(false);
  const pedido = useRef(null); // el ticket es de un solo uso: no se canjea dos veces
  const titulo = useRef(null);

  useEffect(() => {
    if (!ticket || ticket.startsWith("error-") || pedido.current === ticket) return;
    pedido.current = ticket;
    fetch(`/api/auth/google/finish?t=${encodeURIComponent(ticket)}`, { credentials: "same-origin" })
      .catch(() => {
        throw new Error("No hay conexión con Nova. Revisá internet y volvé a intentar.");
      })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data.user) throw new Error(data.error || "No pudimos conectar tu cuenta de Google.");
        try {
          localStorage.setItem("novaia_user", JSON.stringify(data.user));
        } catch {
          /* almacenamiento bloqueado: la sesión sigue en la cookie */
        }
        setAuth(data.user);
        go("");
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket]);

  // Ante un error, el foco va al título para que el lector de pantalla lo anuncie.
  useEffect(() => {
    if (error) titulo.current?.focus();
  }, [error]);

  // Volver con "Atrás" desde Google deja la página en caché: se destraba el botón.
  useEffect(() => {
    const onShow = () => setRetrying(false);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const reintentable = !SIN_REINTENTO.has(ticket);

  function reintentar() {
    setRetrying(true);
    window.location.href = "/api/auth/google/start";
  }

  return (
    <main className="gf-screen">
      <div className="gf-card" aria-live="polite">
        {!error ? (
          <div className="gf-state" role="status">
            <span className="spinner spinner-lg" aria-hidden="true" />
            <h1>Un segundo…</h1>
            <p>Estamos terminando de conectar tu cuenta de Google.</p>
          </div>
        ) : (
          <div className="gf-state">
            <span className="gf-error-icon" aria-hidden="true">
              <Icon name="x" size={24} />
            </span>
            <h1 ref={titulo} tabIndex={-1}>
              No pudimos entrar con Google.
            </h1>
            <p>{error}</p>
            <div className="gf-actions">
              {reintentable && (
                <button type="button" className="btn btn-primary" onClick={reintentar} disabled={retrying}>
                  {retrying ? (
                    <>
                      <span className="spinner" aria-hidden="true" /> Abriendo Google…
                    </>
                  ) : (
                    <>
                      <Icon name="google" size={17} /> Volver a intentar con Google
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                className={reintentable ? "btn btn-ghost" : "btn btn-primary"}
                onClick={() => go("login")}
              >
                Entrar con email y contraseña
              </button>
            </div>
            <p className="foot-note">
              ¿Sin cuenta todavía? Podés{" "}
              <button type="button" className="linklike" onClick={() => go("chat")}>
                seguir como invitado
              </button>{" "}
              con 3 mensajes por día.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
