// Catálogo de mini agentes. El prompt real vive en el servidor (functions/api/chat.js);
// acá solo se describe la tarjeta. Si un id no coincide, el backend responde con Nova normal.
export const AGENT_KEY = "novaia_agent";

export const AGENTS = [
  {
    id: "ventawhats",
    name: "Ventas por WhatsApp",
    icon: "send",
    desc: "Pegás el mensaje del cliente y te lo devuelve contestado, listo para copiar.",
    sample: "Cliente: hola, tenés la 42 en negro? cuánto sale con envío a Santa Fe?",
    perfil: true,
  },
  {
    id: "escritor",
    name: "Escritor",
    icon: "doc",
    desc: "Redactás, te devuelve el texto prolijo y con opciones de tono.",
    sample: "Escribí un mail breve para pedir un presupuesto",
  },
  {
    id: "programador",
    name: "Programador",
    icon: "bot",
    desc: "Escribe código, lo explica y lo revisa contigo.",
    sample: "Hacé una función en Python que lea un CSV sin pandas",
  },
  {
    id: "ideas",
    name: "Lluvia de ideas",
    icon: "wand",
    desc: "Genera opciones rápidas cuando no sabés por dónde empezar.",
    sample: "Dame 10 nombres para un emprendimiento de panificados",
  },
  {
    id: "resumidor",
    name: "Resumidor",
    icon: "knot",
    desc: "Convierte texto largo en puntos clave.",
    sample: "Resumí esto en 5 bullets",
  },
  {
    id: "explicador",
    name: "Explicador",
    icon: "cpu",
    desc: "Te baja un tema difícil a palabras simples.",
    sample: "Explicame cómo funciona un transformador",
  },
  {
    id: "traductor",
    name: "Traductor",
    icon: "send",
    desc: "Pasa entre español e inglés sin perder el sentido.",
    sample: "Pasá esto a inglés natural",
  },
];
