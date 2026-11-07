// La memoria de Nova: notas cortas que el usuario guarda y que entran al
// system prompt de TODAS las conversaciones.
//
// Mejora con el uso. Contra una API cruda de OpenRouter es la diferencia real:
// el modelo es el mismo, pero ya sabe que este usuario vende repuestos en
// Rosario y odia el relleno. Contra ChatGPT es paridad, no ventaja: no vender
// esto como si fuera exclusivo.

const MAX_NOTAS = 40;
const MAX_LARGO = 220;

export function limpiarNota(texto) {
  return String(texto || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LARGO);
}

export async function notasDe(env, userId) {
  if (!userId || !env.DB) return [];
  const { results } = await env.DB
    .prepare("SELECT id, note, created_at FROM memories WHERE user_id = ? ORDER BY id DESC LIMIT ?")
    .bind(userId, MAX_NOTAS)
    .all();
  return results || [];
}

export function promptMemoria(notas) {
  if (!notas || !notas.length) return null;
  const lineas = notas.map((n) => `- ${typeof n === "string" ? n : n.note}`).join("\n");
  return (
    "Memoria de largo plazo sobre esta persona (la pidió guardar ella). " +
    "Usala para personalizar la respuesta, no la recites ni la menciones salvo que pregunten. " +
    "Si algo de acá entra en conflicto con lo que dicen en la conversación, gana lo que dicen ahora.\n" +
    lineas
  );
}

export const LIMITE_NOTAS = MAX_NOTAS;
