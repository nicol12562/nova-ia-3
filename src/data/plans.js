// Datos extraídos en vivo de la página de planes (verificados oct 2026)
export const plans = [
  {
    id: "gratis",
    name: "Gratis",
    badge: "Uso ocasional",
    isCurrent: true,
    description: "Para consultas puntuales, probar Nova y resolver dudas ocasionales sin pagar.",
    tokensPerMonth: "1.000.000",
    price: "Gratis",
    models: [
      ["Nova Flash", "hasta 1.000.000"],
      ["Nova Pro", "hasta 100.000"],
      ["Nova Pro 3.1", "hasta 25.000"],
      ["Nova Mini Flash", "respaldo de 250.000"],
    ],
    extras: ["Sin creación de mini agentes"],
    cta: "Empezar gratis",
    activation: "Inmediata",
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Uso frecuente",
    description: "Para quienes usan Nova casi todos los días para estudiar, trabajar, programar y escribir.",
    tokensPerMonth: "2.500.000",
    price: "$20.000 ARS/mes",
    models: [
      ["Nova Flash", "hasta 2.500.000"],
      ["Nova Pro", "hasta 1.500.000"],
      ["Nova Pro 3.1", "hasta 750.000"],
    ],
    extras: ["Crear mini agentes"],
    cta: "Solicitar este plan",
    activation: "Revisión manual",
  },
  {
    id: "plus",
    name: "Plus",
    badge: "Uso intensivo",
    description: "Para creadores, desarrolladores y usuarios intensivos con sesiones largas y varios proyectos en marcha.",
    tokensPerMonth: "5.000.000",
    price: "$40.000 ARS/mes",
    models: [
      ["Nova Flash", "hasta 5.000.000"],
      ["Nova Pro", "hasta 4.000.000"],
      ["Nova Pro 3.1", "hasta 3.000.000"],
    ],
    extras: ["Crear mini agentes"],
    cta: "Solicitar este plan",
    activation: "Revisión manual",
  },
];

export const comparison = {
  headers: ["Incluye", "Gratis", "Pro", "Plus"],
  rows: [
    ["Ideal para", "Uso ocasional", "Uso frecuente", "Uso intensivo"],
    ["Cuota mensual", "1 millón", "2,5 millones", "5 millones"],
    ["Nova Flash", "1.000.000", "2.500.000", "5.000.000"],
    ["Nova Pro", "100.000", "1.500.000", "4.000.000"],
    ["Nova Pro 3.1", "25.000", "750.000", "3.000.000"],
    ["Mini agentes personalizados", "No", "Sí", "Sí"],
    ["Precio", "Gratis", "$20.000 ARS/mes", "$40.000 ARS/mes"],
    ["Solicitud y activación", "Inmediata", "Revisión manual", "Revisión manual"],
  ],
};

export const notes = [
  "Las cuotas son límites de uso, no una promesa de que cada nombre de modelo tenga una calidad distinta. La configuración actual puede dirigir varios nombres al mismo proveedor gratuito.",
  "El acceso a los modelos se valida en el backend. Los cambios a Pro y Plus son manuales y requieren aprobación del propietario.",
];
