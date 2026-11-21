// Catálogo de mini agentes. El prompt real vive en el servidor (functions/api/chat.js,
// AGENT_PROMPTS); acá solo se describe la fila. Si un id no coincide, el backend
// responde con Nova normal. Si cambiás lo que hace un agente en el servidor, ajustá
// `desc` y `entrega` acá para que la página no prometa otra cosa.
//
// Campos:
// - desc: qué hace, en una frase (lo usan Agentes, Inicio y la cabecera del chat).
// - entrega: qué te devuelve, tal cual lo pide su prompt.
// - pegas: qué conviene pegarle para que ande bien.
// - sample: se manda TAL CUAL al tocar "Probar con el ejemplo" en el chat, así que
//   tiene que ser un pedido completo, con el texto adentro si el agente lo necesita.
export const AGENT_KEY = "novaia_agent";

export const AGENTS = [
  {
    id: "ventawhats",
    name: "Ventas por WhatsApp",
    icon: "chat",
    desc: "Pegás el mensaje del cliente y te lo devuelve contestado, listo para copiar.",
    entrega: "De 1 a 4 líneas con voseo, sin firma ni viñetas. Si falta un precio o el stock, te lo pregunta en vez de inventarlo.",
    pegas: "El mensaje del cliente y, si querés, precios, talles o zona de envío.",
    sample: "Cliente: hola, tenés la 42 en negro? cuánto sale con envío a Santa Fe? Dato: la 42 negra está a $58.000 y el envío a Santa Fe sale $6.500.",
    perfil: true,
  },
  {
    id: "escritor",
    name: "Escritor",
    icon: "doc",
    desc: "Le contás qué necesitás decir y te devuelve el texto listo para usar.",
    entrega: "El texto directo, sin explicaciones. Si le falta contexto, dos o tres versiones cortas: formal, cercana y directa.",
    pegas: "A quién va, para qué y el tono, o un borrador para dejarlo prolijo.",
    sample: "Escribí un mail breve para pedirle un presupuesto de pintura a un proveedor nuevo. Es para un local de 40 m².",
  },
  {
    id: "programador",
    name: "Programador",
    icon: "bot",
    desc: "Escribe código completo, lo explica y te ayuda a encontrar dónde falla.",
    entrega: "Código entero y ejecutable en el lenguaje que pidas, y tres o cuatro líneas sobre por qué está hecho así.",
    pegas: "Qué querés lograr, el lenguaje, y el código con el error si ya tenés uno.",
    sample: "Hacé una función en Python que lea un CSV sin pandas y devuelva una lista de diccionarios.",
  },
  {
    id: "ideas",
    name: "Lluvia de ideas",
    icon: "wand",
    desc: "Te tira opciones bien distintas cuando no sabés por dónde arrancar.",
    entrega: "Entre 8 y 12 ideas numeradas y, al final, cuál le parece la más fuerte y por qué.",
    pegas: "El tema y cualquier límite: público, presupuesto, tono.",
    sample: "Dame 10 nombres para un emprendimiento de panificados caseros que vende por Instagram en Rosario.",
  },
  {
    id: "resumidor",
    name: "Resumidor",
    icon: "list",
    desc: "Pegás un texto largo y te quedás con lo esencial.",
    entrega: "De 3 a 6 puntos en orden de importancia y una línea con lo que se pierde al resumir. No agrega nada que no esté en el texto.",
    pegas: "El texto completo: un apunte, un mail largo, un artículo.",
    sample:
      "Resumí este texto: La fotosíntesis es el proceso por el que las plantas, las algas y algunas bacterias usan la luz del sol para transformar agua y dióxido de carbono en glucosa y oxígeno. Ocurre en los cloroplastos, gracias a la clorofila, que absorbe sobre todo luz roja y azul. Tiene dos etapas: la fase luminosa, que necesita luz y produce ATP y NADPH, y el ciclo de Calvin, que usa esa energía para fijar el carbono. Casi todo el oxígeno de la atmósfera viene de este proceso.",
  },
  {
    id: "explicador",
    name: "Explicador",
    icon: "bulb",
    desc: "Te baja un tema difícil a palabras simples, con un ejemplo de la vida real.",
    entrega: "La idea central en dos frases, un ejemplo concreto y, al final, el detalle técnico por si lo querés.",
    pegas: "El tema o el párrafo que no entendés.",
    sample: "Explicame cómo funciona la inflación y por qué suben los precios aunque no cambie el producto.",
  },
  {
    id: "traductor",
    name: "Traductor",
    icon: "languages",
    desc: "Pasa entre español e inglés como lo diría alguien de allá, no palabra por palabra.",
    entrega: "La traducción natural y, si un modismo cambió de sentido, una nota corta que lo aclara.",
    pegas: "El texto y, si importa, para quién es (un cliente, un jefe, un amigo).",
    sample: "Pasá esto a inglés natural para un cliente: «Te paso el presupuesto mañana a primera hora, cualquier cosa me avisás».",
  },
];
