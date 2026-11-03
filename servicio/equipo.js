// Equipo de un líder y su sistema de alarmas (se usa en el panel y en el correo semanal)
import { q } from './db.js';
import { metaFor } from './voz.js';

const TZ = 'America/Bogota';
const thisMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7);
const today = () => Number(new Date().toLocaleDateString('en-CA', { timeZone: TZ }).slice(8, 10));
const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(d)) / 864e5) : null);

export const teamSql = (where) => `SELECT u.id, u.name, u.email, u.area, u.sede, u.cargo, u.last_seen, (u.photo IS NOT NULL) AS has_photo, u.leader_id,
    e.status, e.plan_published, (e.report->>'puntaje_global')::int AS score,
    m.id AS mod_id, m.numero AS mod_num, m.titulo AS mod_titulo, (r.user_id IS NOT NULL) AS leido, a.best, coalesce(a.n, 0)::int AS intentos, coalesce(a.passed, false) AS aprobado,
    ac.publicados, ac.aprobados, pl.total AS plan_total, pl.hechos AS plan_hechos,
    (SELECT max(fecha) FROM sessions_1a1 s WHERE s.user_id = u.id AND to_char(s.fecha, 'YYYY-MM') = $1) AS uno_mes,
    (SELECT count(*) FROM compromisos c WHERE c.user_id = u.id AND c.estado IN ('pendiente','parcial'))::int AS comp_abiertos,
    (SELECT count(*) FROM compromisos c WHERE c.user_id = u.id AND c.estado IN ('pendiente','parcial') AND c.fecha_limite < (now() AT TIME ZONE 'America/Bogota')::date)::int AS comp_vencidos,
    e.created_at AS ev_created, e.started_at AS ev_started,
    (SELECT round(avg(promedio), 1)::float FROM feedback f WHERE f.user_id = u.id AND f.estado = 'valida') AS voz,
    (SELECT count(*) FROM feedback f WHERE f.user_id = u.id AND f.estado = 'valida' AND to_char(f.created_at AT TIME ZONE 'America/Bogota', 'YYYY-MM') = $1)::int AS voz_mes,
    (SELECT count(*) FROM feedback f WHERE f.user_id = u.id AND f.estado = 'revision')::int AS voz_rev, u.meta_voz,
    (SELECT round(avg(promedio), 1)::float FROM feedback f WHERE f.user_id = u.id AND f.estado = 'valida' AND to_char(f.created_at AT TIME ZONE 'America/Bogota', 'YYYY-MM') = $1) AS voz_pmes,
    (SELECT round(avg(promedio), 1)::float FROM feedback f WHERE f.user_id = u.id AND f.estado = 'valida' AND to_char(f.created_at AT TIME ZONE 'America/Bogota', 'YYYY-MM') = to_char((to_date($1, 'YYYY-MM') - interval '1 month'), 'YYYY-MM')) AS voz_pprev
  FROM users u
  LEFT JOIN LATERAL (SELECT * FROM evaluations WHERE user_id = u.id ORDER BY id DESC LIMIT 1) e ON true
  LEFT JOIN study_modules m ON m.area = u.area AND m.mes = $1 AND m.published
  LEFT JOIN study_reads r ON r.user_id = u.id AND r.module_id = m.id
  LEFT JOIN LATERAL (SELECT max(score) AS best, count(*) AS n, bool_or(passed) AS passed FROM study_attempts WHERE user_id = u.id AND module_id = m.id) a ON true
  LEFT JOIN LATERAL (SELECT count(*)::int AS publicados, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM study_attempts sa WHERE sa.module_id = sm.id AND sa.user_id = u.id AND sa.passed))::int AS aprobados
    FROM study_modules sm WHERE sm.area = u.area AND sm.published AND sm.mes <= $1) ac ON true
  LEFT JOIN LATERAL (SELECT count(*)::int AS total, count(*) FILTER (WHERE i.estado = 'hecho')::int AS hechos FROM plan_items i JOIN plans p ON p.id = i.plan_id WHERE p.user_id = u.id AND p.mes = $1 AND p.published) pl ON true
  WHERE ${where}
  ORDER BY u.area, u.name`;
export const withMeta = (rows) => rows.map((r) => ({ ...r, meta: metaFor(r) }));
export const teamOf = async (leader) => withMeta((await q(teamSql("u.role = 'staff' AND u.approved AND u.active AND u.id <> $2 AND ($3 OR u.leader_id = $2)"), [thisMonth(), leader.id, Boolean(leader.leads_all)])).rows);
export const selfRow = async (u) => (await q(teamSql('u.id = $2'), [thisMonth(), u.id])).rows[0];

// Alarmas por persona: alta (urgente), media (atención), info (por revisar) y logro (para reconocer)
export function alarmsFor(r, day = today()) {
  const a = [];
  const add = (sev, t, accion) => a.push({ sev, t, accion });
  if (!r.status || r.status === 'pendiente') {
    const d = daysSince(r.ev_created);
    add(d != null && d > 10 ? 'alta' : 'media', d != null && d > 3 ? `No ha empezado su evaluación (${d} días)` : 'No ha empezado su evaluación', 'Recuérdale hacerla. Si no le llega el correo, el director le asigna una clave temporal.');
  } else if (r.status === 'en_curso' && daysSince(r.ev_started) > 3) add('media', 'Evaluación sin terminar', 'Anímale a terminarla: se guarda sola y puede hacerla por partes.');
  if (r.mod_id && !r.aprobado) {
    if (r.intentos >= 2) add('alta', 'Perdió el módulo del mes', 'Repasa el tema en el uno a uno y acuerda un compromiso sobre él.');
    else if (day >= 24) add('alta', 'El módulo cierra en pocos días y no lo ha aprobado', 'Pídele que lo presente esta semana.');
    else if (r.intentos === 1) add('media', `Reprobó el primer intento (${r.best}%)`, 'Le queda un intento con preguntas distintas: que repase la teoría primero.');
    else if (r.leido && day >= 15) add('media', 'Estudió el módulo pero no ha presentado la evaluación', 'Recuérdale presentarla: son 10 casos.');
    else if (!r.leido && day >= 8) add('media', 'No ha empezado el módulo del mes', 'Acompáñalo a empezar: la teoría es corta.');
  }
  if (r.plan_total && r.plan_hechos < r.plan_total) {
    const exp = Math.max(0, (day / 30) * 100 - 30), prog = (100 * r.plan_hechos) / r.plan_total;
    if (prog < exp) add('media', `Plan del mes atrasado (${r.plan_hechos}/${r.plan_total})`, 'Revisen juntos qué le impide avanzar.');
  }
  if (!r.uno_mes) { if (day >= 20) add('alta', 'Sin uno a uno este mes', 'Agéndalo esta semana: va de cara al módulo y a sus compromisos.'); else if (day >= 10) add('info', 'Agenda su uno a uno del mes', 'Elige un momento después de que estudie el módulo.'); }
  if (r.comp_vencidos) add('media', `${r.comp_vencidos} compromiso${r.comp_vencidos > 1 ? 's' : ''} vencido${r.comp_vencidos > 1 ? 's' : ''}`, 'Revísalos con la persona y ajusta la fecha o el compromiso.');
  if (r.voz_pmes != null && r.voz_pmes < 3.5) add('alta', `Calificación QR baja este mes (${r.voz_pmes.toFixed(1)})`, 'Lee sus comentarios y trabaja la dimensión más baja en el uno a uno.');
  else if (r.voz_pmes != null && r.voz_pprev != null && r.voz_pprev - r.voz_pmes >= 0.5) add('alta', `Bajó su calificación QR (${r.voz_pprev.toFixed(1)} → ${r.voz_pmes.toFixed(1)})`, 'Conversa qué cambió y revisa los comentarios.');
  if (r.meta && day >= 15 && r.voz_mes < ((r.meta * day) / 30) * 0.6) add('media', `Meta QR atrasada (${r.voz_mes}/${r.meta})`, 'Recuérdale invitar a calificar al terminar cada atención.');
  if (r.voz_rev) add('info', `${r.voz_rev} calificación${r.voz_rev > 1 ? 'es' : ''} QR por revisar`, 'Valida las legítimas y anula las sospechosas en su ficha.');
  const d = daysSince(r.last_seen);
  if (d == null) add('media', 'Nunca ha entrado a la plataforma', 'Verifica que tenga acceso: enlace al correo o clave temporal.');
  else if (d > 14) add('alta', `Lleva ${d} días sin entrar`, 'Contáctalo directamente.');
  else if (d > 7) add('media', `Lleva ${d} días sin entrar`, 'Envíale un mensaje de ánimo.');
  if (r.aprobado) add('logro', `Aprobó el módulo del mes${r.best ? ` con ${r.best}%` : ''}`, 'Felicítalo: el reconocimiento a tiempo multiplica el esfuerzo.');
  if (r.meta && r.voz_mes >= r.meta) add('logro', `Cumplió su meta QR (${r.voz_mes}/${r.meta})`, 'Reconócelo frente al equipo.');
  if (r.voz_pmes != null && r.voz_pprev != null && r.voz_pmes - r.voz_pprev >= 0.3) add('logro', `Subió su calificación QR (${r.voz_pprev.toFixed(1)} → ${r.voz_pmes.toFixed(1)})`, 'Cuéntale que se nota su esfuerzo.');
  return a;
}
const SEV = { alta: 0, media: 1, info: 2, logro: 3 };
export const sortAlarms = (list) => list.sort((x, y) => SEV[x.sev] - SEV[y.sev]);
