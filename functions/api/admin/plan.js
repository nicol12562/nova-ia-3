// POST /api/admin/plan  { user_id, plan }
//
// Ya NO cambia el plan: deja la propuesta en la cola. Recién
// POST /api/admin/changes { accion: 'aprobar' } escribe en users.

import { actorDe, describir, json, proponer, puerta } from "../../_lib/cambios.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const corte = puerta(request, env);
  if (corte) return corte;

  const body = await request.json().catch(() => null);
  const cambio = await describir(env, "plan", body);
  if (cambio.error) return json({ error: cambio.error }, cambio.status);

  return json({ staged: true, ...(await proponer(env, cambio, await actorDe(request, env))) });
}
