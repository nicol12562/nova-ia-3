import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./polish.css";

createRoot(document.getElementById("root")).render(<App />);

// La app arrancó bien: permitimos que la autocuración vuelva a intentarlo si
// un deploy futuro rompe el arranque.
try {
  sessionStorage.removeItem("novaia_boot_retry");
} catch {
  /* sin sessionStorage disponible */
}
