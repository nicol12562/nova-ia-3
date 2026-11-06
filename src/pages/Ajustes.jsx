import React, { useState } from "react";
import { Icon } from "../icons.jsx";
import { showToast } from "../ui.jsx";
import { IDIOMAS, LARGOS, leerPrefs, escribirPrefs } from "../data/prefs.js";

export default function Ajustes({ go, auth, setAuth, dark, toggleTheme }) {
  const planName = auth?.plan === "plus" ? "Plus" : auth?.plan === "pro" ? "Pro" : "Gratis";
  const [prefs, setPrefs] = useState(leerPrefs);
  const [abierto, setAbierto] = useState(false);

  function cambiar(parche) {
    const next = { ...prefs, ...parche };
    setPrefs(next);
    escribirPrefs(next);
  }

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

          <div className="settings-row prefs-row">
            <div>
              <strong>Preferencias de respuesta</strong>
              <p>
                {IDIOMAS.find((i) => i.id === prefs.idioma)?.label} ·{" "}
                {LARGOS.find((l) => l.id === prefs.largo)?.label}
              </p>
            </div>
            <button
              className="btn btn-ghost"
              aria-expanded={abierto}
              onClick={() => setAbierto((v) => !v)}
            >
              {abierto ? "Ocultar" : "Personalizar"} <Icon name={abierto ? "chevronDown" : "arrowUpRight"} size={12} />
            </button>
          </div>

          {abierto && (
            <div className="prefs-panel">
              <div className="prefs-group">
                <span className="mono-label">IDIOMA DE RESPUESTA</span>
                <div className="opt-row">
                  {IDIOMAS.map((i) => (
                    <button
                      key={i.id}
                      className={"opt" + (prefs.idioma === i.id ? " on" : "")}
                      onClick={() => cambiar({ idioma: i.id })}
                    >
                      <strong>{i.label}</strong>
                      <span>{i.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="prefs-group">
                <span className="mono-label">LARGO DE LA RESPUESTA</span>
                <div className="opt-row">
                  {LARGOS.map((l) => (
                    <button
                      key={l.id}
                      className={"opt" + (prefs.largo === l.id ? " on" : "")}
                      onClick={() => cambiar({ largo: l.id })}
                    >
                      <strong>{l.label}</strong>
                      <span>{l.hint}</span>
                    </button>
                  ))}
                </div>
                <p className="prefs-hint">
                  <Icon name="pulse" size={12} />
                  {` Breve responde más rápido: limita la salida a ${LARGOS.find((l) => l.id === "breve").maxTokens} tokens.`}
                </p>
              </div>

              <div className="prefs-group">
                <span className="mono-label" htmlFor="pref-modelo">MODELO PREFERIDO</span>
                <select
                  id="pref-modelo"
                  className="prefs-select"
                  value={prefs.modelo}
                  onChange={(e) => cambiar({ modelo: e.target.value })}
                >
                  <option value="flash">Nova Flash · el más rápido</option>
                  <option value="pro">Nova Pro · mejor texto largo</option>
                  <option value="pro31">Nova Pro 3.1 · el más capaz</option>
                </select>
                <p className="prefs-hint">
                  Se aplica al abrir el chat; igual lo podés cambiar desde el composer.
                </p>
              </div>
            </div>
          )}

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
