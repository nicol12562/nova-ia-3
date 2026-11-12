// GET /api/admin/users — listado de cuentas, planes y consumo.
// Protegido por la cabecera x-admin-key contra el secreto ADMIN_KEY.
// La clave se guarda solo en el servidor; el rol en localStorage es cosmético.

import { CUOTA } from "../../_lib/models.js";

const P = CUOTA; // techos del plan, los mismos que cumple el chat

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.ADMIN_KEY) return json({ error: "Falta el secreto ADMIN_KEY en el servidor." }, 503);
  if (request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
    return json({ error: "Clave de administración incorrecta." }, 401);
  }

  const desde = new Date().toISOString().slice(0, 7) + "-01";

  const sql = `
    SELECT u.id, u.email, u.name, u.plan, u.role, u.created_at,
           COALESCE(cm.t_in, 0) AS t_in_mes, COALESCE(cm.t_out, 0) AS t_out_mes,
           COALESCE(tm.t_in, 0) AS t_in_total, COALESCE(tm.t_out, 0) AS t_out_total,
           COALESCE(cv.n, 0) AS conversaciones, COALESCE(ms.n, 0) AS mensajes
    FROM users u
    LEFT JOIN (SELECT user_id, SUM(tokens_in) t_in, SUM(tokens_out) t_out
               FROM usage_daily WHERE day >= ?1 GROUP BY user_id) cm ON cm.user_id = u.id
    LEFT JOIN (SELECT user_id, SUM(tokens_in) t_in, SUM(tokens_out) t_out
               FROM usage_daily GROUP BY user_id) tm ON tm.user_id = u.id
    LEFT JOIN (SELECT user_id, COUNT(*) n FROM conversations GROUP BY user_id) cv ON cv.user_id = u.id
    LEFT JOIN (SELECT c.user_id, COUNT(*) n FROM messages m
               JOIN conversations c ON c.id = m.conversation_id GROUP BY c.user_id) ms ON ms.user_id = u.id
    ORDER BY u.id DESC`;

  let rows;
  try {
    const res = await env.DB.prepare(sql).bind(desde).all();
    rows = res.results || [];
  } catch (e) {
    return json({ error: "No se pudo leer la base: " + String(e && e.message || e) }, 500);
  }

  const usuarios = rows.map((u) => {
    const mes = u.t_in_mes + u.t_out_mes;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      plan: u.plan,
      role: u.role,
      alta: u.created_at,
      mes,
      total: u.t_in_total + u.t_out_total,
      in: u.t_in_total,
      out: u.t_out_total,
      conversaciones: u.conversaciones,
      mensajes: u.mensajes,
      limite: P[u.plan] || P.gratis,
      pct: Math.min(100, Math.round((mes / (P[u.plan] || P.gratis)) * 100)),
    };
  });

  const porPlan = usuarios.reduce((a, u) => ((a[u.plan] = (a[u.plan] || 0) + 1), a), {});

  return json({
    desde,
    resumen: {
      total: usuarios.length,
      activos_7dias: usuarios.filter((u) => Date.now() - new Date(u.alta + "Z") < 7 * 864e5).length,
      tokens_mes: usuarios.reduce((a, u) => a + u.mes, 0),
      conversaciones: usuarios.reduce((a, u) => a + u.conversaciones, 0),
      mensajes: usuarios.reduce((a, u) => a + u.mensajes, 0),
      porPlan,
    },
    usuarios,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
