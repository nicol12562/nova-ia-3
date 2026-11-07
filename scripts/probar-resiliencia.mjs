import {
  RESERVA,
  candidatosDe,
  cooldownSegun,
  estaFrio,
  esErrorDeCredencial,
  esRecuperable,
} from "../functions/_lib/resiliencia.js";

let ok = 0;
const t = (nombre, real, esperado) => {
  const igual = JSON.stringify(real) === JSON.stringify(esperado);
  if (igual) ok++;
  console.log(igual ? "PASS" : "FAIL", "|", nombre.padEnd(44), igual ? "" : `→ ${JSON.stringify(real)} (esperaba ${JSON.stringify(esperado)})`);
};

t("cooldown 1 fallo = 60s", cooldownSegun(1), 60);
t("cooldown 2 fallos = 120s", cooldownSegun(2), 120);
t("cooldown 3 fallos = 240s", cooldownSegun(3), 240);
t("cooldown 4 fallos = 480s", cooldownSegun(4), 480);
t("cooldown 5 fallos = 900s (techo)", cooldownSegun(5), 900);
t("cooldown 99 fallos sigue 900s", cooldownSegun(99), 900);
t("cooldown 0 fallos no es 0s", cooldownSegun(0), 60);

const ahora = Date.parse("2026-11-07T05:00:00Z");
t("sin fila no está frío", estaFrio(null, ahora), false);
t("until en el pasado no está frío", estaFrio({ until: "2026-11-07 04:00:00" }, ahora), false);
t("until en el futuro sí está frío", estaFrio({ until: "2026-11-07 05:30:00" }, ahora), true);

t("429 recuperable", esRecuperable(429), true);
t("503 recuperable", esRecuperable(503), true);
t("fallo de red recuperable", esRecuperable("red"), true);
t("404 no recuperable (modelo muerto)", esRecuperable(404), false);
t("401 no recuperable", esRecuperable(401), false);
t("401 es error de credencial", esErrorDeCredencial(401), true);
t("403 es error de credencial", esErrorDeCredencial(403), true);
t("429 no es credencial", esErrorDeCredencial(429), false);

// El caso que hoy rompe todo: admin fuerza un router gratis y ese proveedor está saturado.
const escalera = ["openrouter/free", "nvidia/nemotron-3-ultra-550b-a55b:free", "deepseek/deepseek-v4-flash"];
t(
  "forzado + escalera + reserva, sin repetidos",
  candidatosDe({ forzado: "openrouter/free", escalera, reserva: RESERVA }),
  [
    "openrouter/free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "deepseek/deepseek-v4-flash",
    "openai/gpt-oss-120b",
    "mistralai/mistral-nemo",
    "~z-ai/glm-flash-latest",
  ]
);
t(
  "el upstream enfriado se saltea",
  candidatosDe({
    forzado: null,
    escalera: ["openrouter/free", "nvidia/nemotron-3-ultra-550b-a55b:free"],
    reserva: ["mistralai/mistral-nemo"],
    frios: ["openrouter/free", "nvidia/nemotron-3-ultra-550b-a55b:free"],
  }),
  ["mistralai/mistral-nemo"]
);
t(
  "sin escalera queda sólo la reserva (nunca lista vacía)",
  candidatosDe({ forzado: null, escalera: [], reserva: ["mistralai/mistral-nemo"] }),
  ["mistralai/mistral-nemo"]
);

console.log(`\n${ok}/21 casos pasan`);
process.exit(ok === 21 ? 0 : 1);
