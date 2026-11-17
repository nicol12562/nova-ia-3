import React from "react";

// Un adorno de fileteado porteño: dos volutas unidas por un tallo con hojas.
// Es el único ornamento de la interfaz; vive en Inicio y en el login.

// Espiral por semicírculos alternados: cada vuelta crece `paso` px.
function espiral(cx, cy, vueltas, paso, sentido = 1) {
  let d = `M ${cx} ${cy}`;
  let x = cx;
  let r = paso / 2;
  let lado = 1;
  for (let i = 0; i < vueltas * 2; i++) {
    const nx = x + lado * r * 2;
    d += ` A ${r} ${r} 0 0 ${sentido > 0 ? 1 : 0} ${nx} ${cy}`;
    x = nx;
    lado = -lado;
    r += paso / 2;
  }
  return { d, x, y: cy };
}

export default function Filete({ className = "", flip = false }) {
  // Voluta izquierda (gira horario) y derecha (antihorario), unidas por un tallo en S.
  const izq = espiral(46, 62, 2, 7, 1);
  const der = espiral(274, 38, 2, 7, 0);
  const tallo = `M ${izq.x} ${izq.y} C ${izq.x + 10} 10, 150 96, 172 52 S ${der.x - 14} 4, ${der.x} ${der.y}`;
  return (
    <svg
      className={"filete " + className}
      viewBox="0 0 320 100"
      aria-hidden="true"
      focusable="false"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={izq.d} className="f-oro" strokeWidth="5" />
        <path d={der.d} className="f-oro" strokeWidth="5" />
        <path d={tallo} className="f-oro" strokeWidth="5" />
        <path d={tallo} className="f-rojo" strokeWidth="1.8" transform="translate(0 7)" />
      </g>
      {/* Hojas de acanto, una a cada lado del tallo */}
      <path className="f-verde" d="M118 58 C 104 40, 86 42, 76 34 C 92 58, 104 62, 118 58 Z" />
      <path className="f-celeste" d="M206 30 C 222 48, 238 50, 246 60 C 232 36, 220 30, 206 30 Z" />
      <circle className="f-rojo-fill" cx="172" cy="52" r="5" />
    </svg>
  );
}
