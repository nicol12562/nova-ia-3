// Datos de la página de planes. Los números de cuota y techo por modelo los sirve
// el backend (/api/usage) desde functions/_lib/models.js; acá vive la prosa y lo
// que no se puede calcular. Si un modelo deja de existir, se cambia en models.js.

import { AGENTS } from "./agents.js";

// Se arma desde el catálogo real: si se agrega o se quita un agente, el texto de
// las tarjetas no queda diciendo un número viejo.
const EXTRAS_PAGO = [`Los ${AGENTS.length} mini agentes`, "Respuestas más largas"];

export const plans = [
  {
    id: "gratis",
    name: "Gratis",
    badge: "Para empezar",
    isCurrent: true,
    description: "Resolvé dudas puntuales, probá las tres formas de responder y quedate con el historial.",
    tokensPerMonth: "1.000.000",
    price: "Gratis",
    models: [
      ["Nova Flash", "hasta 1.000.000"],
      ["Nova Pro", "hasta 100.000"],
      ["Nova Pro 3.1", "hasta 25.000"],
    ],
    extras: ["Historial y búsqueda", "Sin mini agentes"],
    cta: "Empezar gratis",
    activation: "Inmediata",
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Para todos los días",
    description: "Si usás Nova casi diario para estudiar, trabajar, programar o atender clientes.",
    tokensPerMonth: "2.500.000",
    price: "$20.000 ARS/mes",
    models: [
      ["Nova Flash", "hasta 2.500.000"],
      ["Nova Pro", "hasta 1.500.000"],
      ["Nova Pro 3.1", "hasta 750.000"],
    ],
    extras: EXTRAS_PAGO,
    cta: "Solicitar este plan",
    activation: "Revisión manual",
  },
  {
    id: "plus",
    name: "Plus",
    badge: "Para uso intensivo",
    description: "Sesiones largas, proyectos en paralelo y el modelo más denso sin tope corto.",
    tokensPerMonth: "5.000.000",
    price: "$40.000 ARS/mes",
    models: [
      ["Nova Flash", "hasta 5.000.000"],
      ["Nova Pro", "hasta 4.000.000"],
      ["Nova Pro 3.1", "hasta 3.000.000"],
    ],
    extras: EXTRAS_PAGO,
    cta: "Solicitar este plan",
    activation: "Revisión manual",
  },
];

export const comparison = {
  headers: ["Incluye", "Gratis", "Pro", "Plus"],
  rows: [
    ["Ideal para", "Probar y dudas sueltas", "Uso diario", "Uso intensivo"],
    ["Cuota mensual", "1 millón", "2,5 millones", "5 millones"],
    ["Nova Flash", "1.000.000", "2.500.000", "5.000.000"],
    ["Nova Pro", "100.000", "1.500.000", "4.000.000"],
    ["Nova Pro 3.1", "25.000", "750.000", "3.000.000"],
    ["Largo máximo por respuesta", "2.048 tokens", "4.096 tokens", "8.192 tokens"],
    ["Mini agentes", "No", "Sí", "Sí"],
    ["Historial, búsqueda y memoria", "Sí", "Sí", "Sí"],
    ["Precio", "Gratis", "$20.000 ARS/mes", "$40.000 ARS/mes"],
    ["Activación", "Inmediata", "Por WhatsApp", "Por WhatsApp"],
  ],
};

// Transparencia, no letra chica. Cada línea tiene que ser verificable en el código.
export const notes = [
  "Nova no entrena modelos propios: deriva tu mensaje a proveedores de IA a través de OpenRouter y te cobra por uso, con un techo mensual por cada rol.",
  "Nova Flash, Nova Pro y Nova Pro 3.1 son roles dentro de Nova, no marcas de modelo. El proveedor que atiende cada rol se muestra al lado del nombre en el Inicio y puede cambiar; cuando cambia, actualizamos esta página.",
  "Los planes pago se activan y se cancelan a mano, escribiendo al mismo WhatsApp. No hay débito automático: cada mes se solicita.",
];
