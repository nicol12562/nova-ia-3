import React, { useEffect, useState } from "react";
import { Icon } from "../icons.jsx";

const MOTIVOS = {
  "error-no_config": "Google todavía no está configurado en el servidor (faltan los secretos del cliente OAuth).",
  "error-faltan_datos": "Google no devolvió los datos esperados. Volvé a intentar.",
  "error-estado_invalido": "El intento de acceso venció por seguridad. Volvé a intentar.",
  "error-token_invalido": "No pudimos validar tu identidad con Google. Volvé a intentar.",
  "error-token_vencido": "La sesión de Google venció antes de completar el ingreso. Volvé a intentar.",
  "error-email_no_verificado": "Tu email de Google no está verificado. Verificalo y probá de nuevo.",
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
    <div className="login-right" style={{ minHeight: "100vh", justifyContent: "center" }}>
      <div className="login-box gf-card" style={{ paddingTop: 0 }}>
        {!error ? (
          <>
            <span className="spinner spinner-dark spinner-lg" aria-hidden="true" />
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              <Icon name="sparkle" size={14} /> CONECTANDO CON GOOGLE
            </p>
            <h1 className="hero" style={{ fontSize: 38, margin: "8px 0 0" }}>
              Un segundo…
            </h1>
            <p className="lede" style={{ marginTop: 12 }}>
              Estamos entrando a tu espacio de Nova.
            </p>
          </>
        ) : (
          <>
            <span className="gf-error-icon" aria-hidden="true">
              <Icon name="x" size={24} />
            </span>
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              ALGO NO SALIÓ COMO ESPERÁBAMOS
            </p>
            <h1 className="hero" style={{ fontSize: 38, margin: "8px 0 0" }}>
              Ups.
            </h1>
            <p className="lede" style={{ margin: "12px 0 24px" }}>
              {error}
            </p>
            <button className="btn btn-primary btn-sheen" onClick={() => go("login")}>
              Volver a iniciar sesión <Icon name="arrowUpRight" size={13} />
            </button>
            <p className="foot-note" style={{ marginTop: 16 }}>
              Si el problema sigue, probá con tu email y contraseña.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
