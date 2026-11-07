// Tareas de la demo comparativa. El cliente manda solo el id; el prompt vive acá,
// así nadie lo manipula ni usa el endpoint como proxy gratis de OpenRouter.

export const TAREAS = [
  {
    id: "matematica",
    label: "Matemática paso a paso",
    icon: "pulse",
    criterio: "Se ve si el modelo razona o adivina el número.",
    prompt:
      "Un producto cuesta $2.450 y le hacen un 17% de descuento. Al día siguiente le suben " +
      "un 8% sobre el precio descontado. ¿Cuánto cuesta finalmente? Resolvé paso a paso y " +
      "después decí el resultado final en una sola línea.",
  },
  {
    id: "logica",
    label: "Lógica trampa",
    icon: "knot",
    criterio: "El test clásico: mide si se deja llevar por la intuición.",
    prompt:
      "Un bate y una pelota cuestan $1.10 en total. El bate cuesta $1,00 más que la pelota. " +
      "¿Cuánto cuesta la pelota? Pensalo y respondé con el número y una explicación breve.",
  },
  {
    id: "codigo",
    label: "Codificación",
    icon: "bot",
    criterio: "Calidad del código: si funciona, si explica, si edge cases.",
    prompt:
      "Escribí una función en JavaScript que reciba un array de objetos y lo agrupe por el " +
      "valor de una clave pasada por parámetro. Tiene que tolerar que la clave falte en " +
      "algunos objetos. Devolvé el código y tres líneas explicando las decisiones.",
  },
  {
    id: "explicar",
    label: "Explicar simple",
    icon: "cpu",
    criterio: "Mide la capacidad de bajar un tema técnico a palabras comunes.",
    prompt:
      "Explicame qué es un índice en una base de datos a alguien que nunca programó. " +
      "Usá una analogía de la vida real y no más de 6 líneas.",
  },
  {
    id: "resumen",
    label: "Resumir sin perder datos",
    icon: "doc",
    criterio: "Si respeta la consigna o infla el texto con relleno.",
    prompt:
      "Resumí en exactamente 3 bullets, sin agregar nada que no esté acá: 'Nova IA corre sobre " +
      "tres roles con techos mensuales distintos. El plan Gratis da 1 millón de tokens en total, pero " +
      "Nova Pro 3.1 sólo 25 mil, así que se agota rápido. Pro multiplica ese techo por 30. " +
      "Plus llega a 3 millones en ese rol y permite respuestas de hasta 8.192 tokens. " +
      "Los mini agentes se desbloquean en Pro.'",
  },
  {
    id: "actualidad",
    label: "Actualidad (sin navegar)",
    icon: "search",
    criterio: "Muestra el límite real: ninguno de los 3 accede a datos de hoy.",
    prompt:
      "¿Cuál fue el resultado del último partido de la selección argentina? Respondé en dos " +
      "líneas, y si no tenés datos de hoy decilo explícitamente en vez de inventar.",
  },
];

// Salidas cortas pero completas: con 420 el código quedaba partido a mitad de bloque.
export const MAX_TOKENS_DEMO = 700;
export const DEMO_POR_DIA = 3;

export function tareaPorId(id) {
  return TAREAS.find((t) => t.id === id) || null;
}
