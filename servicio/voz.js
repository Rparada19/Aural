// Voz de quienes atendemos: encuesta anónima de 5 preguntas por código QR de cada persona
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { q, one } from './db.js';

const SURVEYS = {
  pacientes: {
    publico: 'pacientes, familiares y acompañantes',
    quien: ['Paciente', 'Familiar', 'Acompañante'],
    preguntas: [
      ['escucha', '¿Te escuchó con atención y entendió lo que necesitabas?'],
      ['claridad', '¿Te explicó todo de forma clara y sin afán?'],
      ['trato', '¿Fue amable y paciente contigo y con quien te acompañaba?'],
      ['resolvio', '¿Resolvió lo que necesitabas o te dejó claro el siguiente paso?'],
      ['recomienda', '¿Recomendarías esta atención a alguien que quieres?'],
    ],
  },
  medicos: {
    publico: 'médicos y equipos de consultorio',
    quien: ['Médico especialista', 'Recepcionista o asistente', 'Otro'],
    preguntas: [
      ['valor', '¿La información que le compartió es útil para su práctica?'],
      ['preparacion', '¿Demostró preparación técnica al conversar?'],
      ['tiempo', '¿Respeta su tiempo y la dinámica del consultorio?'],
      ['seguimiento', '¿Le informa cómo van los pacientes que remite?'],
      ['recomienda', '¿Recomendaría a sus pacientes ser atendidos por Aural?'],
    ],
  },
  profesionales: {
    publico: 'audiólogas y audiólogos de clientes wholesale',
    quien: ['Audióloga o audiólogo', 'Dueño o administrador', 'Otro'],
    preguntas: [
      ['rapidez', '¿Respondió tu solicitud en un tiempo adecuado?'],
      ['tecnico', '¿Demostró dominio técnico para resolver tu caso?'],
      ['claridad', '¿Te explicó la solución de forma clara y práctica?'],
      ['cierre', '¿Hizo seguimiento hasta cerrar el caso?'],
      ['recomienda', '¿Recomendarías el soporte de Aural a un colega?'],
    ],
  },
  clientes_b2b: {
    publico: 'clientes wholesale',
    quien: ['Dueño o administrador', 'Audióloga o audiólogo', 'Otro'],
    preguntas: [
      ['conoce', '¿Conoce tu negocio y lo que necesitas?'],
      ['portafolio', '¿Te asesora bien en portafolio y software?'],
      ['cumple', '¿Cumple lo que promete en pedidos, garantías y tiempos?'],
      ['proactivo', '¿Te mantiene informado y se anticipa a los problemas?'],
      ['recomienda', '¿Recomendarías trabajar con Aural a un colega?'],
    ],
  },
  general: {
    publico: 'pacientes, clientes y aliados',
    quien: ['Paciente o familiar', 'Cliente o aliado', 'Médico o consultorio', 'Otro'],
    preguntas: [
      ['escucha', '¿Te escuchó con atención y entendió lo que necesitabas?'],
      ['claridad', '¿Te explicó todo de forma clara?'],
      ['trato', '¿Fue amable y respetuoso contigo?'],
      ['resolvio', '¿Resolvió tu caso o te dejó claro el siguiente paso?'],
      ['recomienda', '¿Recomendarías a Aural por esta atención?'],
    ],
  },
};
const BY_AREA = { visitadores: 'medicos', audiologico: 'profesionales', wholesale: 'clientes_b2b', lideres: 'general' };
export const surveyKey = (area) => BY_AREA[area] || 'pacientes';
export const surveyFor = (area) => SURVEYS[surveyKey(area)];
export const LABELS = Object.fromEntries(Object.values(SURVEYS).flatMap((s) => s.preguntas));

export async function qrToken(userId) {
  const r = await one('UPDATE users SET qr_token = coalesce(qr_token, $2) WHERE id = $1 RETURNING qr_token', [userId, crypto.randomBytes(6).toString('base64url')]);
  return r?.qr_token;
}
export const qrSvg = (url) => QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#041E42', light: '#FFFFFF' } });

export async function saveFeedback(user, body) {
  const s = surveyFor(user.area);
  const answers = {};
  for (const [k] of s.preguntas) { const v = Number(body[k]); if (!(v >= 1 && v <= 5)) return false; answers[k] = v; }
  const quien = s.quien.includes(body.quien) ? body.quien : '';
  const prom = Object.values(answers).reduce((a, b) => a + b, 0) / s.preguntas.length;
  await q('INSERT INTO feedback (user_id, area, encuesta, quien, answers, promedio, comentario) VALUES ($1,$2,$3,$4,$5,$6,$7)',
    [user.id, user.area, surveyKey(user.area), quien, JSON.stringify(answers), prom.toFixed(2), String(body.comentario || '').trim().slice(0, 600)]);
  return true;
}

// Resumen de una persona: promedio, número de respuestas, promedio por pregunta y comentarios recientes
// closedOnly: solo meses cerrados (lo que ve la propia persona); el líder y el director ven todo al día
const MONTH_START = "(date_trunc('month', now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota')";
export async function voiceOf(userId, closedOnly = false) {
  const w = closedOnly ? `AND created_at < ${MONTH_START}` : '';
  const tot = await one(`SELECT count(*)::int AS n, round(avg(promedio), 1)::float AS prom,
      count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS n30,
      (SELECT count(*)::int FROM feedback WHERE user_id = $1 AND created_at >= ${MONTH_START}) AS n_mes
    FROM feedback WHERE user_id = $1 ${w}`, [userId]);
  const dims = (await q(`SELECT k, round(avg(v::numeric), 1)::float AS v FROM feedback f, jsonb_each_text(f.answers) AS x(k, v) WHERE f.user_id = $1 ${w} GROUP BY k`, [userId])).rows;
  const comments = (await q(`SELECT quien, comentario, promedio::float AS prom, created_at FROM feedback WHERE user_id = $1 AND comentario <> '' ${w} ORDER BY id DESC LIMIT 8`, [userId])).rows;
  return { ...tot, dims, comments, closedOnly };
}
