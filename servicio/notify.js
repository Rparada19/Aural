// Avisos automáticos del programa: resultados al líder, plan publicado, recordatorios por inactividad y ganadores del mes.
import { q, one } from './db.js';
import { AREAS } from './areas.js';
import { sendMail, mailConfigured } from './mail.js';
import { PASS, MAX_ATTEMPTS, lastDay } from './study.js';

const TZ = 'America/Bogota';
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
const BASE = () => (process.env.BASE_URL || '').replace(/\/$/, '');
const admins = () => (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const first = (n) => esc(String(n || '').split(' ')[0]);
const monthName = (mes) => new Date(`${mes}-15T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
const daysSince = (d) => (d ? (Date.now() - new Date(d).getTime()) / 86400000 : Infinity);
const areaName = (k) => (AREAS[k]?.label || k).replace(/^(Servicio al cliente|Comercial) · /, '').replace(' · Atención a pacientes', '').replace(' (especialistas de producto B2B)', ' B2B');

export const METODOLOGIA = [
  'La Academia Aural tiene 12 módulos, uno por mes, pensados para tu área.',
  'Cada módulo se habilita el día 1 y tienes hasta el último día del mes para estudiarlo.',
  'Primero lees la teoría (con ejemplos e imágenes) y luego presentas una evaluación de 10 preguntas con casos reales: varias respuestas pueden ser válidas, pero solo una es la mejor.',
  'Cada persona recibe preguntas distintas y en otro orden, así que la evaluación es solo tuya.',
  'Cada mes tienes una sesión uno a uno con tu líder sobre el módulo: acuerdan compromisos y en la siguiente revisan cómo te fue.',
  'Tienes 2 intentos y apruebas con 85%. Al cerrar el mes el módulo se bloquea: si no lo aprobaste, queda como no aprobado.',
  'Cada módulo aprobado suma puntos en el ranking mensual de tu área.',
];

export function emailHtml({ name, title, paras = [], list = [], cta, link, foot }) {
  return `<div style="font-family:Arial,sans-serif;color:#041E42;max-width:540px;margin:auto;padding:24px">
  ${name !== undefined ? `<p style="color:#5B6478;margin:0 0 8px">Hola${name ? ` ${name}` : ''},</p>` : ''}
  ${title ? `<h2 style="margin:0 0 14px;font-size:21px;line-height:1.25">${esc(title)}</h2>` : ''}
  ${paras.map((p) => `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">${p}</p>`).join('')}
  ${list.length ? `<ul style="padding-left:18px;margin:0 0 14px;line-height:1.6">${list.map((l) => `<li>${l}</li>`).join('')}</ul>` : ''}
  ${cta ? `<p style="margin:24px 0"><a href="${link}" style="background:#041E42;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(cta)}</a></p>` : ''}
  <p style="color:#8A93A6;font-size:12px;margin-top:24px">${foot || 'Aural · Programa de servicio'}</p></div>`;
}

// Envía un aviso una sola vez por clave
async function once(key, fn) {
  const r = await one('INSERT INTO notifications (key) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id', [key]);
  if (!r) return 0;
  try { await fn(); return 1; } catch (e) { await q('DELETE FROM notifications WHERE id = $1', [r.id]); console.error('aviso', key, e.message); return 0; }
}

const toPerson = (p, subject, opts) => sendMail(p.email, subject, [opts.title, ...(opts.paras || []).map((x) => x.replace(/<[^>]+>/g, '')), opts.link].filter(Boolean).join('\n\n'), emailHtml({ name: first(p.name), ...opts }));

// Paso 3: resultados al líder
export async function notifyReportReady(evaluationId) {
  if (!mailConfigured()) return;
  const ev = await one('SELECT e.id, e.report, u.id AS uid, u.name, u.area, u.sede FROM evaluations e JOIN users u ON u.id = e.user_id WHERE e.id = $1', [evaluationId]);
  const r = ev?.report;
  if (!r) return;
  const html = emailHtml({
    title: `Resultados de ${ev.name}: ${r.puntaje_global}/100${r.nivel ? ` · ${r.nivel}` : ''}`,
    paras: [`${esc(areaName(ev.area))}${ev.sede ? ` · ${esc(ev.sede)}` : ''}`, esc(r.resumen)],
    list: [
      `<strong>Fortalezas:</strong> ${(r.fortalezas || []).map((f) => esc(f.titulo)).join('; ')}`,
      `<strong>Oportunidades de mejora:</strong> ${(r.oportunidades || []).map((f) => esc(f.titulo)).join('; ')}`,
      ...(r.alertas?.length ? [`<strong style="color:#B42318">Alertas:</strong> ${r.alertas.map(esc).join('; ')}`] : []),
      `<strong>Plan propuesto:</strong> ${esc(r.plan?.objetivo || '')}`,
    ],
    cta: 'Revisar y publicar el plan', link: `${BASE()}/admin/personas/${ev.uid}`,
    foot: 'Cuando publiques el plan, la persona recibe un correo y lo ve en su espacio.',
  });
  for (const a of admins()) await sendMail(a, `Resultados de evaluación: ${ev.name} (${r.puntaje_global}/100)`, `${ev.name}: ${r.puntaje_global}/100\n${r.resumen}\n\n${BASE()}/admin/personas/${ev.uid}`, html).catch((e) => console.error('aviso líder', e.message));
}

// Pasos 4 y 5: plan publicado + bienvenida a la Academia
export async function notifyPlanPublished(evaluationId) {
  if (!mailConfigured()) return;
  const ev = await one('SELECT e.id, e.report, u.id AS uid, u.email, u.name FROM evaluations e JOIN users u ON u.id = e.user_id WHERE e.id = $1', [evaluationId]);
  if (!ev?.report) return;
  const r = ev.report;
  await once(`plan:${ev.id}`, () => toPerson(ev, 'Tu plan de trabajo y la Academia Aural', {
    title: 'Ya tienes tu plan de trabajo',
    paras: [
      'Revisamos tu evaluación y preparamos un plan pensado para ti.',
      `<strong>Lo que haces muy bien:</strong> ${(r.fortalezas || []).map((f) => esc(f.titulo)).join(', ')}.`,
      `<strong>Lo que vamos a reforzar:</strong> ${(r.oportunidades || []).map((f) => esc(f.titulo)).join(', ')}.`,
      '<strong>Inicias la Academia Aural.</strong> Así funciona:',
    ],
    list: METODOLOGIA.map(esc),
    cta: 'Ver mi plan', link: `${BASE()}/`,
  }));
}

// Paso 6: recordatorios
async function remindEvaluations() {
  let n = 0;
  const { rows } = await q(`SELECT u.id, u.email, u.name, e.id AS eid, e.status, e.created_at, e.started_at FROM users u
    JOIN LATERAL (SELECT * FROM evaluations WHERE user_id = u.id ORDER BY id DESC LIMIT 1) e ON true
    WHERE u.role = 'staff' AND u.active AND u.approved AND e.status IN ('pendiente', 'en_curso')`);
  for (const p of rows) {
    const link = `${BASE()}/evaluacion`;
    if (p.status === 'pendiente') {
      for (const d of [3, 7, 14]) if (daysSince(p.created_at) >= d) {
        n += await once(`eval${d}:${p.eid}`, () => toPerson(p, 'Tu evaluación de servicio te espera', { title: 'Aún no has empezado tu evaluación', paras: ['Toma unos 40 minutos y se guarda sola, así que puedes hacerla por partes. Es el primer paso para construir tu plan de trabajo.'], cta: 'Empezar mi evaluación', link }));
      }
    } else if (daysSince(p.started_at) >= 3) {
      n += await once(`evalc:${p.eid}`, () => toPerson(p, 'Te falta poco para terminar tu evaluación', { title: 'Continúa tu evaluación', paras: ['Tus respuestas están guardadas. Termínala para recibir tu plan de trabajo.'], cta: 'Continuar', link }));
    }
  }
  return n;
}

async function remindStudy() {
  const mes = todayStr().slice(0, 7);
  const day = Number(todayStr().slice(8, 10));
  const ld = lastDay(mes);
  let n = 0;
  for (const m of (await q('SELECT * FROM study_modules WHERE published AND mes = $1', [mes])).rows) {
    const people = (await q(`SELECT u.id, u.email, u.name,
        EXISTS (SELECT 1 FROM study_reads r WHERE r.user_id = u.id AND r.module_id = $2) AS leyo,
        (SELECT count(*) FROM study_attempts a WHERE a.user_id = u.id AND a.module_id = $2)::int AS intentos,
        EXISTS (SELECT 1 FROM study_attempts a WHERE a.user_id = u.id AND a.module_id = $2 AND a.passed) AS aprobo
      FROM users u WHERE u.role = 'staff' AND u.active AND u.approved AND u.area = $1`, [m.area, m.id])).rows;
    const link = `${BASE()}/estudio/${m.id}`;
    const foot = `Tienes hasta el ${ld} de ${monthName(mes)} · ${MAX_ATTEMPTS} intentos · se aprueba con ${PASS}%`;
    for (const p of people) {
      if (p.aprobo || p.intentos >= MAX_ATTEMPTS) continue;
      const num = m.numero ? `Módulo ${m.numero} de 12: ` : '';
      n += await once(`mod-open:${m.id}:${p.id}`, () => toPerson(p, `Nuevo módulo de la Academia: ${m.titulo}`, { title: `${num}${m.titulo}`, paras: [`Ya está disponible tu módulo del mes. ${esc(m.objetivo)}`], cta: 'Ir al módulo', link, foot }));
      if (day >= 8 && !p.leyo) n += await once(`mod8:${m.id}:${p.id}`, () => toPerson(p, 'Aún no empiezas tu módulo del mes', { title: 'Tu módulo te está esperando', paras: [`Todavía no has entrado a estudiar "${esc(m.titulo)}". Dedícale unos minutos hoy: la teoría es corta y práctica.`], cta: 'Empezar a estudiar', link, foot }));
      if (day >= 15 && p.leyo && !p.intentos) n += await once(`mod15:${m.id}:${p.id}`, () => toPerson(p, 'Ya estudiaste, ahora presenta tu evaluación', { title: 'Presenta la evaluación del módulo', paras: [`Ya leíste "${esc(m.titulo)}". Te falta la evaluación: 10 preguntas y ${MAX_ATTEMPTS} intentos.`], cta: 'Presentar evaluación', link, foot }));
      if (day >= 24) n += await once(`mod24:${m.id}:${p.id}`, () => toPerson(p, `Te quedan ${ld - day + 1} días para tu módulo`, { title: 'El mes está por cerrar', paras: [`Completa "${esc(m.titulo)}" antes del ${ld}. Al cerrar el mes la evaluación se bloquea.`], cta: 'Ir al módulo', link, foot }));
      if (day >= ld - 1) n += await once(`modlast:${m.id}:${p.id}`, () => toPerson(p, 'Último aviso: tu módulo se cierra pronto', { title: day === ld ? 'Hoy es el último día' : 'Mañana se cierra tu módulo', paras: [`Si no presentas la evaluación de "${esc(m.titulo)}", el módulo quedará como no aprobado.`], cta: 'Presentar ahora', link, foot }));
    }
  }
  return n;
}

async function remindInactive() {
  let n = 0;
  const { rows } = await q(`SELECT id, email, name, last_seen FROM users WHERE role = 'staff' AND active AND approved AND last_seen IS NOT NULL AND last_seen < now() - interval '10 days'`);
  for (const p of rows) {
    n += await once(`inact:${p.id}:${new Date(p.last_seen).toISOString().slice(0, 10)}`, () => toPerson(p, 'Te extrañamos en tu espacio de servicio', { title: 'Hace días no entras a tu espacio', paras: ['Tu plan del mes, tu módulo de la Academia y el ranking de tu área te esperan. Cada acción que completes suma puntos.'], cta: 'Entrar a mi espacio', link: `${BASE()}/` }));
  }
  return n;
}

// Uno a uno mensual: aviso al líder desde el día 20 si tiene personas sin sesión en el mes
async function remindOneOnOne() {
  const mes = todayStr().slice(0, 7);
  if (Number(todayStr().slice(8, 10)) < 20) return 0;
  let n = 0;
  const { rows } = await q(`SELECT l.id, l.email, l.name, string_agg(u.name, ', ' ORDER BY u.name) AS faltan, count(*)::int AS c
    FROM users l JOIN users u ON u.role = 'staff' AND u.active AND u.approved AND u.id <> l.id AND (l.leads_all OR u.leader_id = l.id)
    WHERE l.lider AND l.active AND NOT l.leads_all AND NOT EXISTS (SELECT 1 FROM sessions_1a1 s WHERE s.user_id = u.id AND to_char(s.fecha, 'YYYY-MM') = $1)
    GROUP BY l.id`, [mes]);
  for (const l of rows) {
    n += await once(`1a1:${mes}:${l.id}`, () => toPerson(l, `Tienes ${l.c} uno a uno pendiente${l.c > 1 ? 's' : ''} este mes`, { title: 'Uno a uno del mes', paras: [`Aún no registras la sesión de este mes con: ${esc(l.faltan)}.`, 'Revisen juntos el módulo de la Academia, el avance de los compromisos anteriores y acuerden nuevos compromisos para cerrar la brecha.'], cta: 'Ir a mi equipo', link: `${BASE()}/lider` }));
  }
  return n;
}

// Paso 7: ganadores del mes anterior
export async function announceWinners(rankingFor, sendMessage) {
  const now = todayStr();
  const d = new Date(`${now.slice(0, 7)}-15T12:00:00`); d.setMonth(d.getMonth() - 1);
  const prev = d.toISOString().slice(0, 7);
  const done = await one("SELECT 1 FROM settings WHERE key = $1", [`ganadores_${prev}`]);
  if (done) return 0;
  const rows = await rankingFor(prev);
  const winners = Object.keys(AREAS).map((k) => [k, rows.filter((r) => r.area === k && r.puntos > 0).slice(0, 2)]).filter(([, w]) => w.length);
  await q("INSERT INTO settings (key, value) VALUES ($1, 'true') ON CONFLICT DO NOTHING", [`ganadores_${prev}`]);
  if (!winners.length) return 0;
  const lines = winners.map(([k, w]) => `${areaName(k)}: ${w.map((x, i) => `${i + 1}. ${x.name} (${x.puntos} pts)`).join(' · ')}`);
  const m = await one("INSERT INTO messages (area, fecha, tipo, titulo, mensaje, tip) VALUES ('todas', $1, 'manual', $2, $3, $4) RETURNING id",
    [now, `Ganadores de ${monthName(prev)}`, `Felicitaciones a quienes lideraron el servicio en ${monthName(prev)}. ${lines.join('. ')}.`, 'Mira el ranking completo y sigue sumando puntos este mes.']);
  await sendMessage(m.id);
  let n = 0;
  if (mailConfigured()) {
    for (const [k, w] of winners) for (const [i, x] of w.entries()) {
      const p = await one('SELECT id, email, name FROM users WHERE id = $1', [x.id]);
      n += await once(`win:${prev}:${p.id}`, () => toPerson(p, `¡Felicitaciones! Quedaste de ${i + 1}.º en ${monthName(prev)}`, { title: `Quedaste de ${i + 1}.º en ${areaName(k)}`, paras: [`Con ${x.puntos} puntos fuiste de los dos mejores de tu área en ${monthName(prev)}. Tu líder se pondrá en contacto contigo para tu premio.`], cta: 'Ver el ranking', link: `${BASE()}/ranking?mes=${prev}` }));
    }
    const html = emailHtml({ title: `Ganadores de ${monthName(prev)}`, paras: ['Estos son los dos primeros de cada área, para entregar los premios:'], list: lines.map(esc), cta: 'Ver el ranking', link: `${BASE()}/ranking?mes=${prev}` });
    for (const a of admins()) await sendMail(a, `Ganadores del ranking de ${monthName(prev)}`, lines.join('\n'), html).catch((e) => console.error('ganadores', e.message));
  }
  return n;
}

export async function runReminders() {
  if (!mailConfigured()) return {};
  return { evaluaciones: await remindEvaluations(), estudio: await remindStudy(), inactivos: await remindInactive(), uno_a_uno: await remindOneOnOne() };
}
