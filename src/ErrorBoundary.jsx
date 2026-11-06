import React from "react";
import { Icon } from "./icons.jsx";

/* Red de seguridad: si una pantalla falla al renderizar, mostramos
   una tarjeta clara en lugar de una página en blanco. */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Nova IA · error de render:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="crash-card" role="alert">
        <span className="gf-error-icon" aria-hidden="true">
          <Icon name="x" size={22} />
        </span>
        <h2>Algo se cortó por acá.</h2>
        <p>No pudimos mostrar esta pantalla. Casi siempre lo resuelve una recarga.</p>
        <div className="crash-actions">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Recargar la página
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              this.setState({ error: null });
              if (location.hash && location.hash !== "#/") location.hash = "#/";
            }}
          >
            Ir al inicio
          </button>
        </div>
        {this.state.error?.message && <p className="crash-detail">{this.state.error.message}</p>}
      </div>
    );
  }
}
