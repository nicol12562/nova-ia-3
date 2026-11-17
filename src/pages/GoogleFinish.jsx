import React, { useEffect, useState } from "react";
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

export default function GoogleFinish({ go, setAuth, ticket }) {
  const [error, setError] = useState(() => (ticket?.startsWith("error-") ? MOTIVOS[ticket] ?? "No pudimos conectarte con Google." : null));

  useEffect(() => {
    if (!ticket || ticket.startsWith("error-")) return;
    fetch(`/api/auth/google/finish?t=${encodeURIComponent(ticket)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "No pudimos conectar tu cuenta de Google.");
        localStorage.setItem("novaia_user", JSON.stringify(data.user));
        setAuth(data.user);
        go("");
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket]);

  return (
    <div className="gf-screen">
      <div className="gf-card">
        {!error ? (
          <>
            <span className="spinner spinner-lg" aria-hidden="true" />
            <h1>
              Un segundo…
            </h1>
            <p>
              Estamos entrando a tu espacio de Nova.
            </p>
          </>
        ) : (
          <>
            <span className="gf-error-icon" aria-hidden="true">
              <Icon name="x" size={24} />
            </span>
            <h1>
              Ups.
            </h1>
            <p>
              {error}
            </p>
            <button className="btn btn-primary" onClick={() => go("login")}>
              Volver a iniciar sesión
            </button>
            <p className="foot-note">
              Si el problema sigue, probá con tu email y contraseña.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
