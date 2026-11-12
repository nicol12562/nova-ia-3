// GET  /api/admin/model  → modelo activo y opciones conocidas
// POST /api/admin/model  { model }  → propone el modelo global (no lo aplica)
//
// El modelo fijo cambia el chat de todos los planes a la vez, así que pasa por
// la misma cola que los planes: POST /api/admin/changes lo aplica.

import { SLOTS } from "../../_lib/models.js";
import { actorDe, describir, json, modeloActual, proponer, puerta } from "../../_lib/cambios.js";

// La lista de opciones se deriva de SLOTS. Mantener una lista a mano fue cómo
// apareció "meta-llama/llama-3.3-70b-instruct:free" acá, que ya no existe en
// OpenRouter: el panel lo ofrecía y al elegirlo se rompía todo el chat.
const OPCIONES = [...new Set(SLOTS.flatMap((s) => Object.values(s.upstream)))];

export async function onRequest(context) {
  const { request, env } = context;
  const corte = puerta(request, env);
  if (corte) return corte;

  if (request.method === "GET") {
    return json({ model: (await modeloActual(env)) || null, opciones: OPCIONES });
  }

  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const body = await request.json().catch(() => null);
  const cambio = await describir(env, "model", body);
  if (cambio.error) return json({ error: cambio.error }, cambio.status);

  return json({ staged: true, ...(await proponer(env, cambio, await actorDe(request, env))) });
}
