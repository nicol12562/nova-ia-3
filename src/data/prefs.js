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

export const DEFAULTS = { idioma: "ar", largo: "breve", modelo: "flash" };

export function leerPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    return { ...DEFAULTS, ...(raw || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function escribirPrefs(p) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* sin storage, la sesión igual funciona con los defaults */
  }
}

export const esValido = (lista, id) => lista.some((x) => x.id === id);
