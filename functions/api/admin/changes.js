// GET  /api/admin/changes  → propuestas pendientes + registro de lo ya resuelto
// POST /api/admin/changes  { id | ids, accion: 'aprobar' | 'descartar' }
//
// Es la única puerta que escribe los cambios del panel. Aprobar vuelve a leer
// el valor real antes de aplicarlo: si cambió desde que se propuso, el pedido
// queda vencido con el motivo en el registro.

import { actorDe, decidir, json, listar, puerta } from "../../_lib/cambios.js";

const ACCIONES = ["aprobar", "descartar"];
const TOPE_LOTE = 50;

export async function onRequest(context) {
  const { request, env } = context;
  const corte = puerta(request, env);
  if (corte) return corte;

  if (request.method === "GET") return json(await listar(env));
  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const body = await request.json().catch(() => null);
  const accion = String(body?.accion || "");
  if (!ACCIONES.includes(accion)) return json({ error: "Acción inválida: usá aprobar o descartar." }, 400);

  const brutos = Array.isArray(body?.ids) ? body.ids : [body?.id];
  const ids = [...new Set(brutos.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, TOPE_LOTE);
  if (!ids.length) return json({ error: "Falta el cambio a resolver." }, 400);

  const out = await decidir(env, ids, accion, await actorDe(request, env));
  return json(out, out.ok ? 200 : 409);
}
