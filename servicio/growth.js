import Anthropic from '@anthropic-ai/sdk';
import { q, one } from './db.js';
import { AREAS } from './areas.js';
import { sendMail, mailConfigured } from './mail.js';
import { studyNotifications } from './study.js';

const MODEL = process.env.ANALYSIS_MODEL || 'claude-opus-5-5';
const TZ = 'America/Bogota';
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
export const thisMonth = () => today().slice(0, 7);
export const monthLabel = (mes) => new Date(`${mes}-15T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

async function callTool(system, content, tool, maxTokens = 4000) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta configurar ANTHROPIC_API_KEY');
  const res = await new Anthropic().messages.create({
    model: MODEL, max_tokens: maxTokens, system,
    tools: [tool], tool_choice: { type: 'tool', name: tool.name },
    messages: [{ role: 'user', content }],
  });
  const t = res.content.find((c) => c.type === 'tool_use');
  if (!t) throw new Error('La IA no devolvió resultado');
  return t.input;
}

export const PULSE = [
  ['servicio', '¿Cómo calificas el servicio que les dimos a pacientes y clientes este mes?'],
  ['preparacion', 'Me sentí preparado/a para resolver lo que me pidieron.'],
  ['herramientas', 'Los procesos y herramientas me facilitaron el trabajo.'],
  ['acompanamiento', 'Me sentí acompañado/a por mi líder.'],
  ['motivacion', 'Me sentí motivado/a con mi trabajo.'],
];

// ---------- Plan mensual ----------

const PLAN_TOOL = {
  name: 'plan_mensual',
  description: 'Entrega el plan de trabajo del mes para el profesional.',
  input_schema: {
    type: 'object', required: ['objetivo', 'acciones', 'mensaje'],
    properties: {
      objetivo: { type: 'string', description: 'Objetivo del mes en una frase, dirigido al profesional.' },
      acciones: {
        type: 'array', minItems: 4, maxItems: 7,
        items: { type: 'object', required: ['accion', 'indicador'], properties: { accion: { type: 'string', description: 'Acción concreta del día a día, verificable' }, indicador: { type: 'string', description: 'Cómo se comprueba que se cumplió' } } },
      },
      mensaje: { type: 'string', description: 'Mensaje breve y motivador para el profesional (tuteo), 2-3 frases.' },
    },
  },
};

export async function generateMonthlyPlan(userId, mes) {
  const u = await one('SELECT * FROM users WHERE id = $1', [userId]);
  const area = AREAS[u.area] || { label: 'Servicio', rol: '', criterios: '' };
  const ev = await one("SELECT report FROM evaluations WHERE user_id = $1 AND report IS NOT NULL ORDER BY id DESC LIMIT 1", [userId]);
  const prev = (await q(`SELECT p.mes, p.objetivo, i.accion, i.estado, i.nota FROM plans p LEFT JOIN plan_items i ON i.plan_id = p.id
    WHERE p.user_id = $1 AND p.mes < $2 ORDER BY p.mes DESC, i.position LIMIT 30`, [userId, mes])).rows;
  const ses = (await q("SELECT fecha, notas, compromisos FROM sessions_1a1 WHERE user_id = $1 AND fecha > now() - interval '120 days' ORDER BY fecha DESC LIMIT 8", [userId])).rows;
  const r = ev?.report;
  const ctx = [
    `Profesional: ${u.name} · Área: ${area.label}${u.sede ? ` · Sede: ${u.sede}` : ''}`,
    `Mes del plan: ${monthLabel(mes)}`,
    r ? `Resultado de su evaluación: puntaje ${r.puntaje_global}/100. ${r.resumen}\nOportunidades: ${(r.oportunidades || []).map((o) => o.titulo).join('; ')}\nFortalezas: ${(r.fortalezas || []).map((o) => o.titulo).join('; ')}\nRuta de 8 semanas propuesta: ${(r.plan?.semanas || []).map((s) => `${s.semana}: ${s.foco}`).join(' | ')}` : 'Aún no tiene evaluación analizada.',
    prev.length ? `Planes anteriores y su avance:\n${prev.map((p) => `- ${p.mes} · ${p.accion || p.objetivo} → ${p.estado || 'sin acciones'}${p.nota ? ` (nota: ${p.nota})` : ''}`).join('\n')}` : 'Es su primer plan mensual.',
    ses.length ? `Sesiones uno a uno recientes:\n${ses.map((s) => `- ${String(s.fecha).slice(0, 10)}: ${s.notas}${s.compromisos ? ` | Compromisos: ${s.compromisos}` : ''}`).join('\n')}` : 'Sin sesiones uno a uno registradas.',
  ].join('\n\n');
  const out = await callTool(
    `Eres un coach de servicio en salud auditiva para Aural Colombia (distribuidor exclusivo de Widex). Diseñas planes de trabajo mensuales, concretos y alcanzables, para profesionales del área "${area.label}". Rol: ${area.rol} Criterios clave: ${area.criterios}
Da continuidad: lo pendiente o no logrado del mes anterior se retoma de forma más simple; lo logrado se consolida o se sube de nivel. Incorpora los compromisos de las sesiones uno a uno. Español de Colombia, tono cercano y profesional.`,
    ctx, PLAN_TOOL,
  );
  const plan = await one(`INSERT INTO plans (user_id, mes, objetivo, mensaje) VALUES ($1,$2,$3,$4)
    ON CONFLICT (user_id, mes) DO UPDATE SET objetivo = EXCLUDED.objetivo, mensaje = EXCLUDED.mensaje RETURNING id`, [userId, mes, out.objetivo, out.mensaje || '']);
  await q("DELETE FROM plan_items WHERE plan_id = $1 AND estado = 'pendiente'", [plan.id]);
  let pos = (await one('SELECT coalesce(max(position),0) AS m FROM plan_items WHERE plan_id = $1', [plan.id])).m;
  for (const a of out.acciones) await q('INSERT INTO plan_items (plan_id, accion, indicador, position) VALUES ($1,$2,$3,$4)', [plan.id, a.accion, a.indicador || '', (pos += 10)]);
  return plan.id;
}

// ---------- Mensajes diarios ----------

const MSG_TOOL = {
  name: 'mensajes_del_dia',
  description: 'Entrega el mensaje del día para cada área.',
  input_schema: {
    type: 'object', required: ['mensajes'],
    properties: {
      mensajes: {
        type: 'array',
        items: {
          type: 'object', required: ['area', 'titulo', 'mensaje', 'tip'],
          properties: {
            area: { type: 'string', enum: Object.keys(AREAS) },
            titulo: { type: 'string', description: 'Título corto y atractivo, máximo 8 palabras' },
            mensaje: { type: 'string', description: 'Mensaje motivacional de 2-3 frases, cálido y genuino, sin frases trilladas' },
            tip: { type: 'string', description: 'Un tip práctico y concreto para aplicar hoy en su trabajo, 2-3 frases' },
          },
        },
      },
    },
  },
};

export async function getSetting(key, def) {
  const r = await one('SELECT value FROM settings WHERE key = $1', [key]);
  return r ? r.value : def;
}
export const setSetting = (key, value) => q('INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, JSON.stringify(value)]);

export async function generateDailyMessages(fecha = today()) {
  const missing = [];
  for (const k of Object.keys(AREAS)) if (!(await one("SELECT 1 FROM messages WHERE area = $1 AND fecha = $2 AND tipo = 'diario'", [k, fecha]))) missing.push(k);
  if (!missing.length) return 0;
  const recent = (await q("SELECT area, titulo FROM messages WHERE fecha > $1::date - 45 ORDER BY fecha DESC", [fecha])).rows;
  const weekday = new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const out = await callTool(
    'Escribes el mensaje diario para los equipos de Aural Colombia (audífonos Widex): una dosis breve de motivación y un tip práctico de servicio, específico para cada área. Nada genérico: cada tip debe poder aplicarse hoy en el trabajo real de esa área. Varía los temas (empatía, comunicación con personas con pérdida auditiva, manejo de objeciones, seguimiento, orden, trabajo en equipo, autocuidado, orgullo por el propósito de devolver la audición). Español de Colombia, tuteo, tono cálido y profesional.',
    `Fecha: ${weekday}.\n\nÁreas a cubrir:\n${missing.map((k) => `- ${k}: ${AREAS[k].label}. ${AREAS[k].rol}`).join('\n')}\n\nNo repitas estos títulos recientes:\n${recent.map((r) => `- [${r.area}] ${r.titulo}`).join('\n') || '(ninguno)'}`,
    MSG_TOOL,
  );
  let n = 0;
  for (const m of out.mensajes) {
    if (!missing.includes(m.area)) continue;
    await q("INSERT INTO messages (area, fecha, tipo, titulo, mensaje, tip) VALUES ($1,$2,'diario',$3,$4,$5) ON CONFLICT DO NOTHING", [m.area, fecha, m.titulo, m.mensaje, m.tip]);
    n++;
  }
  return n;
}

const msgHtml = (m, name) => `<div style="font-family:Arial,sans-serif;color:#041E42;max-width:540px;margin:auto;padding:24px">
  <p style="color:#706F6F;font-size:13px;margin:0 0 6px">${name ? `Hola ${name},` : 'Hola,'}</p>
  <h2 style="margin:0 0 14px;font-size:20px">${esc(m.titulo)}</h2>
  <p style="font-size:15px;line-height:1.55">${esc(m.mensaje)}</p>
  ${m.tip ? `<div style="background:#F4F6F9;border-left:4px solid #041E42;padding:14px 16px;border-radius:8px;margin:18px 0"><strong>Tip para hoy</strong><p style="margin:6px 0 0;line-height:1.5">${esc(m.tip)}</p></div>` : ''}
  <p style="margin:24px 0"><a href="${process.env.BASE_URL}" style="color:#041E42;font-weight:bold">Ver mi plan de trabajo →</a></p>
  <p style="color:#706F6F;font-size:12px">Aural · Servicio</p></div>`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function sendMessage(messageId) {
  const m = await one('SELECT * FROM messages WHERE id = $1', [messageId]);
  if (!m || m.sent_at) return 0;
  const people = (await q("SELECT email, name FROM users WHERE role = 'staff' AND active AND ($1 = 'todas' OR area = $1)", [m.area])).rows;
  let n = 0;
  if (mailConfigured()) {
    for (const p of people) {
      try { await sendMail(p.email, m.titulo, `${m.mensaje}\n\n${m.tip ? `Tip para hoy: ${m.tip}\n\n` : ''}${process.env.BASE_URL}`, msgHtml(m, esc((p.name || '').split(' ')[0]))); n++; } catch (e) { console.error('mensaje', p.email, e.message); }
    }
  }
  await q('UPDATE messages SET sent_at = now(), recipients = $2 WHERE id = $1', [messageId, n]);
  return n;
}

export async function runDaily() {
  const estudio = await studyNotifications(process.env.BASE_URL).catch((e) => { console.error('estudio', e); return 0; });
  if (!(await getSetting('mensajes_activos', true))) return { skipped: true, estudio };
  const fecha = today();
  const generated = await generateDailyMessages(fecha);
  const pending = (await q("SELECT id FROM messages WHERE fecha = $1 AND tipo = 'diario' AND sent_at IS NULL", [fecha])).rows;
  let sent = 0;
  for (const { id } of pending) sent += await sendMessage(id);
  return { generated, sent, estudio };
}
