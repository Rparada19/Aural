// Voz de quienes atendemos: encuesta anónima de 5 preguntas por código QR de cada persona
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { q, one } from './db.js';

// Cada pregunta mide siempre la misma dimensión, pero su redacción rota cada mes (3 versiones)
const SURVEYS = {
  pacientes: {
    publico: 'pacientes, familiares y acompañantes',
    quien: ['Paciente', 'Familiar', 'Acompañante'],
    preguntas: [
      ['escucha', 'Escucha', ['¿Te escuchó con atención y entendió lo que necesitabas?', '¿Sentiste que te prestó toda su atención?', '¿Entendió bien tu situación antes de darte una respuesta?']],
      ['claridad', 'Claridad', ['¿Te explicó todo de forma clara y sin afán?', '¿Saliste con claridad sobre lo que sigue?', '¿Usó palabras fáciles de entender para ti y tu familia?']],
      ['trato', 'Amabilidad y paciencia', ['¿Fue amable y paciente contigo y con quien te acompañaba?', '¿Te hizo sentir bienvenido y respetado?', '¿Tuvo paciencia con tus preguntas?']],
      ['resolvio', 'Solución', ['¿Resolvió lo que necesitabas o te dejó claro el siguiente paso?', '¿Te ayudó a resolver el motivo de tu visita o llamada?', '¿Sentiste que se ocupó de tu caso hasta el final?']],
      ['recomienda', 'Recomendación', ['¿Recomendarías esta atención a alguien que quieres?', '¿Volverías a que te atendiera esta persona?', '¿Le contarías a un amigo o familiar sobre esta atención?']],
    ],
  },
  medicos: {
    publico: 'médicos y equipos de consultorio',
    usted: true,
    quien: ['Médico especialista', 'Recepcionista o asistente', 'Otro'],
    preguntas: [
      ['valor', 'Valor de la información', ['¿La información que le compartió es útil para su práctica?', '¿Le aporta algo nuevo y relevante en cada visita?', '¿El material y los datos que le presenta son pertinentes para sus pacientes?']],
      ['preparacion', 'Preparación técnica', ['¿Demostró preparación técnica al conversar?', '¿Responde con solidez sus preguntas técnicas?', '¿Conoce bien las soluciones auditivas que presenta?']],
      ['tiempo', 'Respeto por su tiempo', ['¿Respeta su tiempo y la dinámica del consultorio?', '¿Sus visitas son puntuales y del tiempo justo?', '¿Coordina la visita con usted o su equipo de forma oportuna?']],
      ['seguimiento', 'Seguimiento a remitidos', ['¿Le informa cómo van los pacientes que remite?', '¿Recibe retroalimentación sobre los pacientes remitidos?', '¿Siente que sus pacientes remitidos están en buenas manos?']],
      ['recomienda', 'Recomendación', ['¿Recomendaría a sus pacientes ser atendidos por Aural?', '¿Seguiría remitiendo pacientes a Aural?', '¿Recomendaría a Aural a un colega?']],
    ],
  },
  profesionales: {
    publico: 'audiólogas y audiólogos de clientes wholesale',
    quien: ['Audióloga o audiólogo', 'Dueño o administrador', 'Otro'],
    preguntas: [
      ['rapidez', 'Rapidez', ['¿Respondió tu solicitud en un tiempo adecuado?', '¿Te atendió con la agilidad que necesitaba tu paciente?', '¿Fue fácil y rápido contactarle?']],
      ['tecnico', 'Dominio técnico', ['¿Demostró dominio técnico para resolver tu caso?', '¿Te dio una solución técnicamente sólida?', '¿Conoce a fondo el software y los equipos?']],
      ['claridad', 'Claridad', ['¿Te explicó la solución de forma clara y práctica?', '¿Te quedó claro cómo aplicar la solución?', '¿Sus indicaciones fueron fáciles de seguir?']],
      ['cierre', 'Seguimiento hasta cerrar', ['¿Hizo seguimiento hasta cerrar el caso?', '¿Se aseguró de que el problema quedara resuelto?', '¿Te mantuvo informado mientras se resolvía?']],
      ['recomienda', 'Recomendación', ['¿Recomendarías el soporte de Aural a un colega?', '¿Volverías a acudir a este soporte con confianza?', '¿El soporte de Aural te ayuda a dar un mejor servicio a tus pacientes?']],
    ],
  },
  clientes_b2b: {
    publico: 'clientes wholesale',
    quien: ['Dueño o administrador', 'Audióloga o audiólogo', 'Otro'],
    preguntas: [
      ['conoce', 'Conoce su negocio', ['¿Conoce tu negocio y lo que necesitas?', '¿Entiende las metas y retos de tu negocio?', '¿Te propone ideas pensadas para tu negocio?']],
      ['portafolio', 'Asesoría en portafolio', ['¿Te asesora bien en portafolio y software?', '¿Te ayuda a elegir el producto correcto para cada paciente?', '¿Te capacita cuando lo necesitas?']],
      ['cumple', 'Cumplimiento', ['¿Cumple lo que promete en pedidos, garantías y tiempos?', '¿Tus pedidos y garantías llegan como se acordó?', '¿Puedes confiar en los tiempos que te da?']],
      ['proactivo', 'Proactividad', ['¿Te mantiene informado y se anticipa a los problemas?', '¿Te avisa a tiempo cuando hay novedades?', '¿Te busca con oportunidades, no solo cuando hay pedidos?']],
      ['recomienda', 'Recomendación', ['¿Recomendarías trabajar con Aural a un colega?', '¿Seguirías trabajando con Aural por esta atención?', '¿Sientes a Aural como un aliado de tu negocio?']],
    ],
  },
  general: {
    publico: 'pacientes, clientes y aliados',
    quien: ['Paciente o familiar', 'Cliente o aliado', 'Médico o consultorio', 'Otro'],
    preguntas: [
      ['escucha', 'Escucha', ['¿Te escuchó con atención y entendió lo que necesitabas?', '¿Sentiste que te prestó toda su atención?', '¿Entendió bien tu situación?']],
      ['claridad', 'Claridad', ['¿Te explicó todo de forma clara?', '¿Saliste con claridad sobre lo que sigue?', '¿Sus respuestas fueron fáciles de entender?']],
      ['trato', 'Trato', ['¿Fue amable y respetuoso contigo?', '¿Te hizo sentir bien atendido?', '¿Tuvo paciencia con tus preguntas?']],
      ['resolvio', 'Solución', ['¿Resolvió tu caso o te dejó claro el siguiente paso?', '¿Se ocupó de tu caso hasta el final?', '¿Encontró una solución a lo que necesitabas?']],
      ['recomienda', 'Recomendación', ['¿Recomendarías a Aural por esta atención?', '¿Volverías a Aural por esta atención?', '¿Le contarías a alguien sobre esta atención?']],
    ],
  },
};
const BY_AREA = { visitadores: 'medicos', audiologico: 'profesionales', wholesale: 'clientes_b2b', lideres: 'general' };
export const surveyKey = (area) => BY_AREA[area] || 'pacientes';
const monthIndex = () => { const [y, m] = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(0, 7).split('-').map(Number); return y * 12 + m; };
// Versión del mes: [clave, texto] para la encuesta y [clave, etiqueta] para los resultados
export function surveyFor(area) {
  const s = SURVEYS[surveyKey(area)];
  const v = (((monthIndex() - (2026 * 12 + 10)) % 3) + 3) % 3;
  return { ...s, preguntas: s.preguntas.map(([k, , t]) => [k, t[v]]), dims: s.preguntas.map(([k, l]) => [k, l]) };
}

export async function qrToken(userId) {
  const r = await one('UPDATE users SET qr_token = coalesce(qr_token, $2) WHERE id = $1 RETURNING qr_token', [userId, crypto.randomBytes(6).toString('base64url')]);
  return r?.qr_token;
}
export const qrSvg = (url) => QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#041E42', light: '#FFFFFF' } });

// ---------- Metas mensuales de calificaciones válidas ----------
const norm = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function metaFor(u) {
  if (u.meta_voz != null) return u.meta_voz;
  if (u.area === 'recepcion') {
    const s = norm(u.sede);
    if (/usaqu|javeriana/.test(s)) return 30;
    if (/bogot|plaza central|unicentro|cedritos|chapinero/.test(s)) return 15;
    return 10;
  }
  return { call_center: 15, audiologia: 20, visitadores: 10, audiologico: 15, wholesale: 20 }[u.area] ?? null;
}

// ---------- Antitrampa ----------
const SALT = crypto.createHash('sha256').update(`voz:${process.env.DATABASE_URL || ''}`).digest('hex');
export const vhash = (x) => crypto.createHash('sha256').update(`${SALT}:${x}`).digest('hex').slice(0, 32);
export const signTs = (ts) => `${ts}.${vhash(`ts:${ts}`).slice(0, 12)}`;
const readTs = (v) => { const [ts, sig] = String(v || '').split('.'); return sig && signTs(ts) === `${ts}.${sig}` ? Number(ts) : null; };

// Marca el dispositivo y la red de cada colaborador que entra a la plataforma
export async function markStaff(userId, dev, ip) {
  if (dev) await q('INSERT INTO staff_marks (kind, hash, user_id) VALUES ($1,$2,$3) ON CONFLICT (kind, hash, user_id) DO UPDATE SET last_seen = now()', ['dev', vhash(dev), userId]);
  if (ip) await q('INSERT INTO staff_marks (kind, hash, user_id) VALUES ($1,$2,$3) ON CONFLICT (kind, hash, user_id) DO UPDATE SET last_seen = now()', ['ip', vhash(ip), userId]);
}

// Devuelve 'valida' | 'revision' | 'excluida' | 'repetida' y las señales detectadas
async function screen(user, dev, ip, ts) {
  const devH = dev ? vhash(dev) : '', ipH = ip ? vhash(ip) : '';
  const flags = [];
  let estado = 'valida';
  if (devH) {
    const own = (await q("SELECT user_id FROM staff_marks WHERE kind = 'dev' AND hash = $1", [devH])).rows.map((r) => r.user_id);
    if (own.length) return { estado: 'excluida', flags: [own.includes(user.id) ? 'Autocalificación: celular o computador del mismo colaborador' : 'Celular o computador de un colaborador'], devH, ipH };
    if (await one("SELECT 1 FROM feedback WHERE user_id = $1 AND dev_hash = $2 AND created_at > now() - interval '7 days'", [user.id, devH])) return { estado: 'repetida', flags: [], devH, ipH };
  } else flags.push('Sin identificador de dispositivo');
  const secs = ts ? Math.round((Date.now() - ts) / 1000) : null;
  const sameNet = ipH && await one("SELECT 1 FROM staff_marks WHERE kind = 'ip' AND hash = $1 AND user_id = $2 AND last_seen > now() - interval '14 days'", [ipH, user.id]);
  const burst = (await one("SELECT count(*)::int AS c FROM feedback WHERE user_id = $1 AND estado <> 'excluida' AND created_at > now() - interval '10 minutes'", [user.id])).c;
  if (secs == null || secs < 15) { flags.push(secs == null ? 'Sin tiempo de respuesta' : `Respondida en ${secs} segundos`); estado = 'revision'; }
  if (burst >= 2) { flags.push('Varias calificaciones seguidas en 10 minutos'); estado = 'revision'; }
  if (sameNet) { flags.push('Misma red de internet que usa el colaborador'); if (secs != null && secs < 40) estado = 'revision'; }
  if (!devH) estado = 'revision';
  return { estado, flags, devH, ipH, secs };
}

export async function saveFeedback(user, body, { dev, ip } = {}) {
  const s = surveyFor(user.area);
  const answers = {};
  for (const [k] of s.preguntas) { const v = Number(body[k]); if (!(v >= 1 && v <= 5)) return false; answers[k] = v; }
  const quien = s.quien.includes(body.quien) ? body.quien : '';
  const prom = Object.values(answers).reduce((a, b) => a + b, 0) / s.preguntas.length;
  const sc = await screen(user, dev, ip, readTs(body.ts));
  if (sc.estado === 'repetida') return true;
  await q('INSERT INTO feedback (user_id, area, encuesta, quien, answers, promedio, comentario, dev_hash, ip_hash, secs, estado, flags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
    [user.id, user.area, surveyKey(user.area), quien, JSON.stringify(answers), prom.toFixed(2), String(body.comentario || '').trim().slice(0, 600), sc.devH, sc.ipH, sc.secs ?? null, sc.estado, sc.flags]);
  return true;
}

// Resumen de una persona: promedio, número de respuestas, promedio por pregunta y comentarios recientes
// closedOnly: solo meses cerrados (lo que ve la propia persona); el líder y el director ven todo al día
const MONTH_START = "(date_trunc('month', now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota')";
export async function voiceOf(userId, closedOnly = false) {
  const V = "estado = 'valida'";
  const w = closedOnly ? `AND created_at < ${MONTH_START}` : '';
  const tot = await one(`SELECT count(*)::int AS n, round(avg(promedio), 1)::float AS prom,
      count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS n30,
      (SELECT count(*)::int FROM feedback WHERE user_id = $1 AND ${V} AND created_at >= ${MONTH_START}) AS n_mes
    FROM feedback WHERE user_id = $1 AND ${V} ${w}`, [userId]);
  const dims = (await q(`SELECT k, round(avg(v::numeric), 1)::float AS v FROM feedback f, jsonb_each_text(f.answers) AS x(k, v) WHERE f.user_id = $1 AND ${V} ${w} GROUP BY k`, [userId])).rows;
  const comments = (await q(`SELECT quien, comentario, promedio::float AS prom, created_at FROM feedback WHERE user_id = $1 AND ${V} AND comentario <> '' ${w} ORDER BY id DESC LIMIT 8`, [userId])).rows;
  const review = closedOnly ? [] : (await q(`SELECT id, estado, flags, promedio::float AS prom, comentario, quien, created_at FROM feedback
    WHERE user_id = $1 AND estado IN ('revision', 'excluida') AND created_at > now() - interval '60 days' ORDER BY id DESC LIMIT 30`, [userId])).rows;
  const months = (await q(`SELECT to_char(created_at AT TIME ZONE 'America/Bogota', 'YYYY-MM') AS mes, count(*)::int AS n, round(avg(promedio), 1)::float AS prom
    FROM feedback WHERE user_id = $1 AND ${V} ${w} GROUP BY 1 ORDER BY 1 DESC LIMIT 6`, [userId])).rows;
  const u = await one('SELECT area, sede, meta_voz FROM users WHERE id = $1', [userId]);
  return { ...tot, dims, comments, review, months, closedOnly, meta: u ? metaFor(u) : null };
}
