// Preferencias del usuario. Se guardan en el dispositivo y se envían al backend,
// que las valida contra estas listas: un valor desconocido vuelve al default.

export const PREFS_KEY = "novaia_prefs";

export const IDIOMAS = [
  { id: "ar", label: "Español (AR)", hint: "voseo" },
  { id: "es", label: "Español neutro", hint: "tú" },
  { id: "en", label: "English", hint: "US" },
];

export const LARGOS = [
  { id: "breve", label: "Breve", hint: "lo esencial, sin preámbulos", maxTokens: 700 },
  { id: "equilibrado", label: "Equilibrado", hint: "respuesta con contexto", maxTokens: 2048 },
  { id: "detallado", label: "Detallado", hint: "todo, con ejemplos", maxTokens: 4096 },
];

// Modelo con el que arranca el chat. Las claves coinciden con las del selector
// del composer; el saldo real de cada uno se ve en Uso.
export const MODELOS = [
  { id: "flash", label: "Nova Flash", hint: "el de saldo más grande" },
  { id: "pro", label: "Nova Pro", hint: "saldo medio, texto y código" },
  { id: "pro31", label: "Nova Pro 3.1", hint: "saldo corto, para lo importante" },
];

export const DEFAULTS = { idioma: "ar", largo: "breve", modelo: "flash" };

export const esValido = (lista, id) => lista.some((x) => x.id === id);


// Un valor viejo o tocado a mano en el storage vuelve al default en vez de
// dejar un control sin ninguna opción marcada.
function sanear(raw) {
  const p = { ...DEFAULTS, ...(raw && typeof raw === "object" ? raw : {}) };
  if (!esValido(IDIOMAS, p.idioma)) p.idioma = DEFAULTS.idioma;
  if (!esValido(LARGOS, p.largo)) p.largo = DEFAULTS.largo;
  if (!esValido(MODELOS, p.modelo)) p.modelo = DEFAULTS.modelo;
  return p;
}

export function leerPrefs() {
  try {
    return sanear(JSON.parse(localStorage.getItem(PREFS_KEY) || "null"));
  } catch {
    return { ...DEFAULTS };
  }
}

// Devuelve false si el navegador no deja guardar (modo privado, storage lleno):
// la interfaz lo avisa en vez de mostrar "guardado" de mentira.
export function escribirPrefs(p) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(sanear(p)));
    return true;
  } catch {
    return false;
  }
}
