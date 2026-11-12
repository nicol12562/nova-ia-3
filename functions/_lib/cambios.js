// Cola de aprobación del panel.
//
// Antes, elegir un plan en el <select> de #/admin escribía en la base en el
// mismo gesto: un click errado le bajaba el plan a alguien que pagó. Ahora todo
// cambio entra acá como 'pending' y recién lo aplica decidir(..., 'aprobar').
//
// `before_value` guarda lo que se vio al proponer. Si al aprobar el valor real
// ya es otro, el cambio queda 'stale' con el motivo en vez de pisar a ciegas.

import { leerSesion } from "./session.js";

const PLANES = ["gratis", "plus", "pro"];
const LARGO_MODELO = 120;

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// La misma puerta que el resto del panel. Devuelve una Response para cortar, o
// null si el pedido puede seguir.
export function puerta(request, env) {
  if (!env.ADMIN_KEY) return json({ error: "Falta el secreto ADMIN_KEY en el servidor." }, 503);
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return json({ error: "Clave de administración incorrecta." }, 401);
  }
  return null;
}

export async function actorDe(request, env) {
  const s = await leerSesion(request, env).catch(() => null);
  return s?.email || "clave de administración";
}

export async function modeloActual(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'model'").first();
  return row?.value || "";
}

// Traduce el pedido del frente a un cambio con antes/después ya leídos de la
// base. Devuelve { error, status } cuando el pedido no se puede ni proponer.
export async function describir(env, kind, payload) {
  if (kind === "plan") {
    const userId = Number(payload?.user_id);
    const plan = String(payload?.plan || "").toLowerCase();
    if (!Number.isInteger(userId) || userId <= 0) return { error: "Usuario inválido.", status: 400 };
    if (!PLANES.includes(plan)) return { error: "Plan inválido: usá gratis, plus o pro.", status: 400 };

    const u = await env.DB.prepare("SELECT id, email, plan FROM users WHERE id = ?").bind(userId).first();
    if (!u) return { error: "Ese usuario no existe.", status: 404 };
    return { kind, target: String(u.id), label: u.email, before: u.plan, after: plan };
  }

  if (kind === "model") {
    const model = String(payload?.model ?? "").trim();
    if (model.length > LARGO_MODELO || /[\x00-\x1f\s]/.test(model)) {
      return { error: "Nombre de modelo inválido.", status: 400 };
    }
    return { kind, target: "global", label: "Modelo global", before: await modeloActual(env), after: model };
  }

  return { error: "Tipo de cambio desconocido.", status: 400 };
}

// Una propuesta viva por cosa editable: cambiar de opinión reemplaza la
// anterior en vez de apilar dos pedidos contradictorios para el mismo usuario.
export async function proponer(env, cambio, actor) {
  const previa = await env.DB
    .prepare("SELECT * FROM admin_changes WHERE kind = ? AND target = ? AND status = 'pending'")
    .bind(cambio.kind, cambio.target)
    .first();

  if (cambio.after === cambio.before) {
    if (previa) await env.DB.prepare("DELETE FROM admin_changes WHERE id = ?").bind(previa.id).run();
    return { ok: true, sinCambio: true, descartada: previa ? fila(previa) : null };
  }

  if (previa) {
    await env.DB
      .prepare(
        `UPDATE admin_changes SET before_value = ?, after_value = ?, label = ?, actor = ?, created_at = datetime('now')
         WHERE id = ?`
      )
      .bind(cambio.before, cambio.after, cambio.label, actor, previa.id)
      .run();
    return { ok: true, cambio: await porId(env, previa.id), reemplazo: previa.after_value !== cambio.after };
  }

  const ins = await env.DB
    .prepare(
      `INSERT INTO admin_changes (kind, target, label, before_value, after_value, actor)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(cambio.kind, cambio.target, cambio.label, cambio.before, cambio.after, actor)
    .run();
  return { ok: true, cambio: await porId(env, ins.meta.last_row_id) };
}

export async function listar(env) {
  const [pend, reg] = await Promise.all([
    env.DB.prepare("SELECT * FROM admin_changes WHERE status = 'pending' ORDER BY id DESC").all(),
    env.DB
      .prepare("SELECT * FROM admin_changes WHERE status <> 'pending' ORDER BY decided_at DESC, id DESC LIMIT 40")
      .all(),
  ]);
  return { pendientes: (pend.results || []).map(fila), registro: (reg.results || []).map(fila) };
}

// accion: 'aprobar' aplica de verdad; 'descartar' cierra la propuesta sin tocar
// nada. Cada id se resuelve por separado para que un cambio vencido no arrastre
// al resto del lote.
export async function decidir(env, ids, accion, actor) {
  const resultados = [];
  for (const id of ids) {
    const row = await porId(env, id);
    if (!row) {
      resultados.push({ id, ok: false, error: "Ese cambio ya no está en la cola." });
      continue;
    }
    if (row.status !== "pending") {
      resultados.push({ id, ok: false, error: "Ese cambio ya estaba resuelto.", status: row.status });
      continue;
    }
    resultados.push(
      accion === "descartar" ? await descartar(env, row, actor) : await aplicar(env, row, actor)
    );
  }
  return { ok: resultados.every((r) => r.ok), resultados, ...(await listar(env)) };
}

async function descartar(env, row, actor) {
  await cerrar(env, row.id, "rejected", actor, null);
  return { id: row.id, ok: true, status: "rejected" };
}

async function aplicar(env, row, actor) {
  if (row.kind === "plan") {
    const u = await env.DB.prepare("SELECT id, email, name, plan, role FROM users WHERE id = ?").bind(row.target).first();
    if (!u) return vencido(env, row, actor, "La cuenta ya no existe.");
    if (u.plan === row.after) {
      await cerrar(env, row.id, "applied", actor, "Ya tenía ese plan.");
      return { id: row.id, ok: true, status: "applied", usuario: u, detalle: "Ya tenía ese plan." };
    }
    if (u.plan !== row.before) {
      return vencido(env, row, actor, `El plan ahora es ${u.plan}, no ${row.before}.`);
    }
    await env.DB.prepare("UPDATE users SET plan = ? WHERE id = ?").bind(row.after, row.target).run();
    await cerrar(env, row.id, "applied", actor, null);
    return { id: row.id, ok: true, status: "applied", usuario: { ...u, plan: row.after } };
  }

  const actual = await modeloActual(env);
  if (actual === row.after) {
    await cerrar(env, row.id, "applied", actor, "Ya estaba aplicado.");
    return { id: row.id, ok: true, status: "applied", model: actual, detalle: "Ya estaba aplicado." };
  }
  if (actual !== row.before) {
    return vencido(env, row, actor, `El modelo global ahora es ${actual || "la escalera por plan"}.`);
  }
  if (row.after) {
    await env.DB
      .prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES ('model', ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .bind(row.after)
      .run();
  } else {
    await env.DB.prepare("DELETE FROM settings WHERE key = 'model'").run();
  }
  await cerrar(env, row.id, "applied", actor, null);
  return { id: row.id, ok: true, status: "applied", model: row.after };
}

async function vencido(env, row, actor, motivo) {
  await cerrar(env, row.id, "stale", actor, motivo);
  return { id: row.id, ok: false, status: "stale", error: "El valor cambió desde que se propuso: " + motivo };
}

function cerrar(env, id, status, actor, detail) {
  return env.DB
    .prepare("UPDATE admin_changes SET status = ?, actor = ?, detail = ?, decided_at = datetime('now') WHERE id = ?")
    .bind(status, actor, detail, id)
    .run();
}

async function porId(env, id) {
  const row = await env.DB.prepare("SELECT * FROM admin_changes WHERE id = ?").bind(id).first();
  return row ? fila(row) : null;
}

function fila(r) {
  return {
    id: r.id,
    kind: r.kind,
    target: r.target,
    label: r.label,
    before: r.before_value || "",
    after: r.after_value || "",
    status: r.status,
    actor: r.actor || null,
    detail: r.detail || null,
    creado: r.created_at,
    decidido: r.decided_at || null,
  };
}
