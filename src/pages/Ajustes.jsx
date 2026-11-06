import React from "react";
import { Icon } from "../icons.jsx";
import { showToast } from "../ui.jsx";

export default function Ajustes({ go, auth, setAuth, dark, toggleTheme }) {
  const planName = auth?.plan === "plus" ? "Plus" : auth?.plan === "pro" ? "Pro" : "Gratis";

  function logout() {
    localStorage.removeItem("novaia_user");
    setAuth(null);
    go("");
  }

  return (
    <section>
      <p className="eyebrow">06 · PREFERENCIAS</p>
      <h1 className="hero">Ajustes</h1>
      <p className="lede">Configurá tu experiencia en Nova IA.</p>

      <div className="settings-stack">
        <div className="settings-card">
          <div className="head">
            <span className="sq"><Icon name="lock" size={19} /></span>
            <div>
              <h3>Cuenta y privacidad</h3>
              <p>Tu cuenta, tus datos y tus preferencias.</p>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <strong>Perfil</strong>
              <p>{auth ? `${auth.name || "Sin nombre"} · ${auth.email} · Plan ${planName}` : "Nombre visible y datos de la cuenta"}</p>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() =>
                auth
                  ? showToast("La edición de perfil llega pronto. Podés cambiar tu nombre al registrarte.")
                  : go("login")
              }
            >
              {auth ? "Editar perfil" : "Iniciar sesión"} <Icon name="arrowUpRight" size={12} />
            </button>
          </div>

          <div className="settings-row">
            <div>
              <strong>Plan actual</strong>
              <p>{auth ? `Estás en el plan ${planName}.` : "Compará los límites de cada plan."}</p>
            </div>
            <button className="btn btn-ghost" onClick={() => go("planes")}>
              Ver planes <Icon name="arrowUpRight" size={12} />
            </button>
          </div>

          <div className="settings-row">
            <div>
              <strong>Historial de chats</strong>
              <p>Los chats quedan vinculados a tu cuenta.</p>
            </div>
            <button className="btn btn-ghost" onClick={() => go("historial")}>
              Abrir historial <Icon name="arrowUpRight" size={12} />
            </button>
          </div>

          <div className="settings-row">
            <div>
              <strong>Preferencias de respuesta</strong>
              <p>Idioma y modelo preferido</p>
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => showToast("Nova responde en Español (Argentina). Más preferencias en la próxima versión.")}
            >
              Personalizar <Icon name="arrowUpRight" size={12} />
            </button>
          </div>

          {auth && (
            <div className="settings-row">
              <div>
                <strong>Sesión</strong>
                <p>Salí de tu cuenta en este dispositivo</p>
              </div>
              <button className="btn btn-ghost" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        <div className="settings-card">
          <div className="head">
            <span className="sq"><Icon name="sun" size={19} /></span>
            <div>
              <h3>Apariencia</h3>
              <p>Elegí cómo se ve Nova IA.</p>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <strong>Tema de la aplicación</strong>
              <p>Cambiá entre apariencia clara y oscura.</p>
            </div>
            <div className={"seg" + (dark ? " is-dark" : "")} role="group" aria-label="Tema de la aplicación">
              <span className="seg-thumb" aria-hidden="true" />
              <button className={!dark ? "on" : ""} onClick={() => dark && toggleTheme()}>
                <Icon name="sun" size={14} /> Claro
              </button>
              <button className={dark ? "on" : ""} onClick={() => !dark && toggleTheme()}>
                <Icon name="moon" size={14} /> Oscuro
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
