// Capa de resiliencia del proxy de modelos.
//
// El problema que resuelve: Nova dependía de un solo router gratuito. Si ese
// proveedor se saturaba (429) o colgaba, el usuario veía "no pude obtener una
// respuesta" o la pantalla pensando para siempre. Acá va la lógica, separada del
// handler para que se pueda probar sin red.

// Reserva de último recurso: modelos PAGOS, de proveedores distintos entre sí y
// de los que usan los planes. Costo real medido hoy: US$0,000044 y US$0,000058
// por mensaje típico (1.500 tokens de entrada + 500 de salida). Con 10.000
// mensajes de reserva son ~US$0,50. Es el precio de que el servicio no se caiga.
export const RESERVA = [
  "openai/gpt-oss-120b",
  "mistralai/mistral-nemo",
  "~z-ai/glm-flash-latest",
];

// Cuánto esperamos el primer token antes de tirar el intento y probar el
// siguiente. 12s: por encima de lo que tarda un modelo sano, por debajo de lo
// que un usuario tolera mirando una pantalla quieta.
export const SLA_PRIMER_TOKEN_MS = 12000;

// Y cuánto toleramos que el stream se quede mudo después de haber empezado.
export const SLA_SILENCIO_MS = 20000;

const COOLDOWN_BASE_S = 60;
const COOLDOWN_MAX_S = 900;

// Un fallo no saca al proveedor por una hora; cinco seguidos, casi sí.
export function cooldownSegun(fallos) {
  const n = Math.max(1, Math.min(fallos || 1, 6));
  return Math.min(COOLDOWN_MAX_S, COOLDOWN_BASE_S * 2 ** (n - 1));
}

// ¿Este upstream está en enfriamiento?
export function estaFrio(fila, ahora = Date.now()) {
  if (!fila?.until) return false;
  const hasta = Date.parse(String(fila.until).replace(" ", "T") + "Z");
  return Number.isFinite(hasta) && hasta > ahora;
}

// Status que justifican reintentar con otro proveedor.
export function esRecuperable(status) {
  if (status === 0 || status === "red") return true; // fetch tiró
  const s = Number(status);
  return s === 408 || s === 429 || (s >= 500 && s <= 599);
}

// 401/403 no se arreglan cambiando de modelo: la key está mal. Reintentar 4
// veces contra lo mismo sólo quema el presupuesto de requests del día.
export function esErrorDeCredencial(status) {
  const s = Number(status);
  return s === 401 || s === 403;
}

// Orden final de intento: lo que pidió el admin, la escalera del plan, y la
// reserva paga al final. Sin repetidos, sin los enfriados.
export function candidatosDe({ forzado, escalera, reserva = RESERVA, frios = [] }) {
  const frio = new Set(frios);
  const vistos = new Set();
  const salida = [];
  for (const id of [forzado, ...escalera, ...reserva]) {
    if (!id || vistos.has(id) || frio.has(id)) continue;
    vistos.add(id);
    salida.push(id);
  }
  return salida;
}
