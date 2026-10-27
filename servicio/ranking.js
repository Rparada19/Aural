import { q } from './db.js';

export async function rankingFor(mes) {
  const { rows } = await q(`SELECT u.id, u.name, u.area, u.sede, (u.photo IS NOT NULL) AS has_photo,
      (SELECT count(*) FROM plan_items i JOIN plans p ON p.id = i.plan_id WHERE p.user_id = u.id AND p.mes = $1 AND i.estado = 'hecho')::int AS acciones,
      (SELECT count(*) FROM sessions_1a1 WHERE user_id = u.id AND to_char(fecha, 'YYYY-MM') = $1)::int AS sesiones,
      (SELECT count(*) FROM pulses WHERE user_id = u.id AND mes = $1)::int AS pulso,
      (SELECT count(*) FROM evaluations WHERE user_id = u.id AND to_char(submitted_at AT TIME ZONE 'America/Bogota', 'YYYY-MM') = $1)::int AS evaluacion,
      st.aprobado, st.primero, st.nota
    FROM users u
    LEFT JOIN LATERAL (SELECT bool_or(a.passed) AS aprobado, (array_agg(a.passed ORDER BY a.id))[1] AS primero, max(a.score) AS nota
      FROM study_attempts a JOIN study_modules m ON m.id = a.module_id WHERE a.user_id = u.id AND m.mes = $1) st ON true
    WHERE u.role = 'staff' AND u.active AND u.approved`, [mes]);
  for (const r of rows) {
    r.p_estudio = r.aprobado ? (r.primero ? 50 : 30) + Math.round((r.nota || 0) / 10) : 0;
    r.puntos = r.p_estudio + r.acciones * 10 + r.sesiones * 10 + r.pulso * 10 + r.evaluacion * 30;
  }
  rows.sort((a, b) => b.puntos - a.puntos || (b.nota || 0) - (a.nota || 0) || a.name.localeCompare(b.name));
  return rows;
}
