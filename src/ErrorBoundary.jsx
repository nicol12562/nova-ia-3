import React from "react";
import { Icon } from "./icons.jsx";

/* Red de seguridad: si una pantalla falla al renderizar, mostramos qué pasó y
   tres salidas (reintentar, volver al inicio, avisar por WhatsApp) en lugar de
   una página en blanco. */

const WHATS = "5493416116096";

// Después de un deploy, el navegador puede pedir un pedazo de la app que ya no
// existe. No es un error del usuario ni de la pantalla: se arregla recargando.
function esVersionVieja(error) {
  const m = String(error?.message || error || "");
  return /dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|error loading dynamically/i.test(m);
}

function linkWhatsApp(error) {
  const ruta = (typeof location !== "undefined" && location.hash) || "#/";
  const detalle = String(error?.message || "sin detalle").slice(0, 200);
  const msg = `Hola, se me cortó una pantalla de Nova IA.\nPantalla: ${ruta}\nError: ${detalle}`;
  return `https://wa.me/${WHATS}?text=${encodeURIComponent(msg)}`;
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, intentos: 0 };
    this.titulo = React.createRef();
    this.reintentar = this.reintentar.bind(this);
    this.irAlInicio = this.irAlInicio.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Nova IA · error de render:", error, info?.componentStack);
  }

  componentDidUpdate(_prev, prevState) {
    // Llevamos el foco al aviso para que teclado y lector de pantalla lo encuentren.
    if (this.state.error && !prevState.error) this.titulo.current?.focus();
  }

  reintentar() {
    if (esVersionVieja(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState((s) => ({ error: null, intentos: s.intentos + 1 }));
  }

  irAlInicio() {
    this.setState({ error: null, intentos: 0 });
    if (location.hash && location.hash !== "#/") location.hash = "#/";
  }

  render() {
    const { error, intentos } = this.state;
    if (!error) return this.props.children;

    const vieja = esVersionVieja(error);
    const insiste = intentos >= 2;

    let explicacion;
    if (vieja) {
      explicacion = "Subimos una versión nueva de Nova mientras la tenías abierta y esta pestaña quedó con la anterior. Recargá y seguís donde estabas: tus chats están guardados.";
    } else if (insiste) {
      explicacion = "Volvió a fallar. Probá recargar la página; si sigue igual, avisanos por WhatsApp y lo miramos.";
    } else {
      explicacion = "Esta pantalla tuvo un error y no se pudo mostrar. Tus chats y tu saldo no se tocaron. Reintentá; casi siempre alcanza.";
    }

    return (
      <section className="crash-card" role="alert" aria-labelledby="crash-titulo">
        <span className="crash-rule" aria-hidden="true" />
        <h2 id="crash-titulo" ref={this.titulo} tabIndex={-1}>
          {vieja ? "Hay una versión nueva de Nova." : "Algo se cortó por acá."}
        </h2>
        <p>{explicacion}</p>
        <div className="crash-actions">
          {insiste && !vieja ? (
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              <Icon name="refresh" size={16} /> Recargar la página
            </button>
          ) : (
            <button className="btn btn-primary" onClick={this.reintentar}>
              <Icon name="refresh" size={16} /> {vieja ? "Recargar" : "Reintentar"}
            </button>
          )}
          <button className="btn btn-ghost" onClick={this.irAlInicio}>
            <Icon name="home" size={16} /> Volver al inicio
          </button>
        </div>
        <p className="crash-contacto">
          ¿Sigue sin andar?{" "}
          <a href={linkWhatsApp(error)} target="_blank" rel="noopener noreferrer">
            Avisanos por WhatsApp
          </a>{" "}
          y lo miramos. El mensaje ya sale con el detalle del error.
        </p>
        {error?.message && (
          <details className="crash-detail">
            <summary>Detalle técnico</summary>
            <code>{error.message}</code>
          </details>
        )}
      </section>
    );
  }
}
