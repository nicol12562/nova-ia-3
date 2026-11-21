// Datos de la página de planes. Los números de cuota y techo por modelo los sirve
// el backend (/api/usage) desde functions/_lib/models.js; acá vive la prosa y lo
// que no se puede calcular. Si un modelo deja de existir, se cambia en models.js.
//
// Orden de menor a mayor: Gratis → Plus ($20.000) → Pro ($40.000). Pro es el plan
// más alto, mismo criterio que usa ChatGPT con Plus/Pro.

import { AGENTS } from "./agents.js";

// Se arma desde el catálogo real: si se agrega o se quita un agente, el texto de
// las tarjetas no queda diciendo un número viejo.
const EXTRAS_PAGO = [`Los ${AGENTS.length} mini agentes`, "Respuestas más largas"];

export const plans = [
  {
    id: "gratis",
    name: "Gratis",
    badge: "Para empezar",
    description: "Resolvé dudas puntuales, probá las tres formas de responder y quedate con el historial.",
    tokensPerMonth: "1.000.000",
    price: "Gratis",
    models: [
      ["Nova Flash", "hasta 1.000.000"],
      ["Nova Pro", "hasta 100.000"],
      ["Nova Pro 3.1", "hasta 25.000"],
    ],
    extras: ["Historial y búsqueda", "Sin mini agentes"],
    cta: "Crear cuenta gratis",
    activation: "Inmediata",
  },
  {
    id: "plus",
    name: "Plus",
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
    id: "pro",
    name: "Pro",
    badge: "El más completo",
    description: "Sesiones largas, proyectos en paralelo y el rol más exigente con su propio upstream.",
    tokensPerMonth: "5.000.000",
    price: "$40.000 ARS/mes",
    models: [
      ["Nova Flash", "hasta 5.000.000"],
      ["Nova Pro", "hasta 4.000.000"],
      ["Nova Pro 3.1", "hasta 3.000.000"],
    ],
    extras: [...EXTRAS_PAGO, "Nova Pro 3.1 con upstream propio"],
    cta: "Solicitar este plan",
    activation: "Revisión manual",
  },
];

export const comparison = {
  headers: ["Incluye", "Gratis", "Plus", "Pro"],
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
    ["Activación", "Inmediata, al crear la cuenta", "En el día, por WhatsApp", "En el día, por WhatsApp"],
    ["Renovación", "No hace falta", "Se pide cada mes", "Se pide cada mes"],
  ],
};

// Preguntas frecuentes. Transparencia, no letra chica: cada respuesta tiene que
// ser verificable en el código (functions/api/chat.js, functions/_lib/models.js)
// o en PRODUCT.md. Si algo no está implementado, no se promete acá.
export const faq = [
  {
    q: "¿Cómo pago un plan?",
    a: "No hay pasarela de pagos ni checkout en la web. Tocás «Pedir por WhatsApp», se abre el chat con el pedido ya escrito y ahí coordinás el pago con la persona que te atiende. Cuando se confirma, el plan se carga a mano en tu cuenta.",
  },
  {
    q: "¿Cuánto tarda en activarse?",
    a: "En el día. Una persona revisa cada pedido, así que no es instantáneo y depende de la hora a la que escribas. Mientras tanto seguís usando tu plan actual sin cortes.",
  },
  {
    q: "¿Se renueva solo?",
    a: "No. No hay suscripción ni débito automático: cada mes se pide de nuevo por el mismo WhatsApp. Si un mes no lo pedís, no se te cobra nada.",
  },
  {
    q: "¿Cómo lo doy de baja o cambio de plan?",
    a: "Escribiendo al mismo WhatsApp. La baja, la subida de Plus a Pro y la bajada se hacen a mano, igual que el alta.",
  },
  {
    q: "¿Emiten factura?",
    a: "Hoy no. Nova no tiene sistema de facturación: es un servicio hecho por una persona y el cobro se arregla por WhatsApp.",
  },
  {
    q: "¿Necesito cuenta?",
    a: "Para probar, no: sin cuenta tenés 3 mensajes por día. Con la cuenta gratis pasás a 1.000.000 tokens por mes. Para pedir un plan pago sí hace falta, porque el plan se activa en tu cuenta.",
  },
  {
    q: "¿Qué pasa si se me termina el saldo de un modelo?",
    a: "Nova contesta con otro rol que todavía tenga saldo en tu plan y te dice cuál respondió. Si se terminan los tres, te avisa en el chat; el saldo se repone el primer día de cada mes.",
  },
  {
    q: "¿Qué son Nova Flash, Nova Pro y Nova Pro 3.1?",
    a: "Roles dentro de Nova, no marcas de modelo. Nova no entrena modelos propios: deriva tu mensaje a proveedores de IA a través de OpenRouter. El proveedor que atiende cada rol se muestra al lado del nombre en el Inicio y puede cambiar.",
  },
];
