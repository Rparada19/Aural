import Anthropic from '@anthropic-ai/sdk';
import { q, one } from './db.js';
import { AREAS } from './areas.js';
import { sendMail, mailConfigured } from './mail.js';

const MODEL = process.env.ANALYSIS_MODEL || 'claude-opus-5-5';
export const PASS = 85;
export const MAX_ATTEMPTS = 2;
const TZ = 'America/Bogota';
const thisMonth = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ }).slice(0, 7);

// abierto | proximo | cerrado según el mes del módulo
export const windowState = (mes) => { const m = thisMonth(); return mes === m ? 'abierto' : mes > m ? 'proximo' : 'cerrado'; };
export const lastDay = (mes) => new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0).getDate();

const MODULE_TOOL = {
  name: 'modulo_estudio',
  description: 'Entrega un módulo de estudio completo.',
  input_schema: {
    type: 'object', required: ['titulo', 'objetivo', 'secciones', 'preguntas'],
    properties: {
      titulo: { type: 'string', description: 'Título del módulo, máximo 8 palabras' },
      objetivo: { type: 'string', description: 'Qué será capaz de hacer el profesional al terminar, una frase' },
      secciones: {
        type: 'array', minItems: 4, maxItems: 6,
        items: {
          type: 'object', required: ['titulo', 'contenido', 'imagen_sugerida'],
          properties: {
            titulo: { type: 'string' },
            contenido: { type: 'string', description: 'Teoría en Markdown simple (párrafos, listas con "- ", subtítulos "### ", negritas y citas "> " para ideas clave). 250-450 palabras, con ejemplos reales del día a día del área y, cuando aplique, frases modelo para decir.' },
            imagen_sugerida: { type: 'string', description: 'Descripción de una imagen o esquema que ilustraría esta sección' },
          },
        },
      },
      preguntas: {
        type: 'array', minItems: 10, maxItems: 10,
        items: {
          type: 'object', required: ['texto', 'opciones', 'correcta', 'explicacion'],
          properties: {
            texto: { type: 'string', description: 'Pregunta o mini caso, basada solo en la teoría del módulo' },
            opciones: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
            correcta: { type: 'integer', minimum: 0, maximum: 3 },
            explicacion: { type: 'string', description: 'Por qué la respuesta es correcta, 1-2 frases' },
          },
        },
      },
    },
  },
};

export async function generateModule(area, mes, tema = '') {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta configurar ANTHROPIC_API_KEY');
  const a = AREAS[area];
  const prev = (await q('SELECT mes, titulo FROM study_modules WHERE area = $1 AND mes <> $2 ORDER BY mes', [area, mes])).rows;
  const gaps = (await q(`SELECT o->>'titulo' AS t, count(*)::int AS n FROM evaluations e JOIN users u ON u.id = e.user_id,
      jsonb_array_elements(e.report->'oportunidades') o WHERE u.area = $1 AND e.report IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 12`, [area])).rows;
  const res = await new Anthropic().messages.create({
    model: MODEL, max_tokens: 16000,
    system: `Eres un diseñador instruccional experto en servicio y salud auditiva. Creas módulos de estudio mensuales para Aural Colombia (distribuidor exclusivo de audífonos Widex) dirigidos al área "${a.label}". Rol del área: ${a.rol} Criterios de excelencia: ${a.criterios}
La teoría debe ser práctica, clara y aplicable, con ejemplos reales del día a día del área y frases modelo cuando aplique. No inventes datos de producto, precios ni normas específicas: si mencionas normas (por ejemplo, protección de datos personales), hazlo de forma general. La evaluación tiene 10 preguntas de selección única, basadas solo en la teoría del módulo, con distractores plausibles; se aprueba con 85%. Español de Colombia, tuteo.`,
    tools: [MODULE_TOOL], tool_choice: { type: 'tool', name: 'modulo_estudio' },
    messages: [{
      role: 'user',
      content: `Mes del módulo: ${mes}.
${tema ? `Tema pedido por el líder: ${tema}` : 'Elige el tema más valioso para el área en este punto de la ruta.'}
Módulos ya creados para esta área (da continuidad y no repitas): ${prev.map((p) => `${p.mes}: ${p.titulo}`).join(' | ') || 'ninguno, este es el primero'}.
Oportunidades de mejora más frecuentes en las evaluaciones del área: ${gaps.map((g) => `${g.t} (${g.n})`).join('; ') || 'aún no hay evaluaciones analizadas'}.`,
    }],
  });
  const t = res.content.find((c) => c.type === 'tool_use');
  if (!t) throw new Error('La IA no devolvió el módulo');
  const m = t.input;
  return one(`INSERT INTO study_modules (area, mes, titulo, objetivo, secciones, preguntas) VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (area, mes) DO UPDATE SET titulo = EXCLUDED.titulo, objetivo = EXCLUDED.objetivo, secciones = EXCLUDED.secciones, preguntas = EXCLUDED.preguntas RETURNING id`,
  [area, mes, m.titulo, m.objetivo, JSON.stringify(m.secciones), JSON.stringify(m.preguntas)]);
}

export async function userModuleState(userId, mod) {
  const attempts = (await q('SELECT id, score, passed, created_at FROM study_attempts WHERE user_id = $1 AND module_id = $2 ORDER BY id', [userId, mod.id])).rows;
  const read = await one('SELECT read_at FROM study_reads WHERE user_id = $1 AND module_id = $2', [userId, mod.id]);
  const passed = attempts.some((a) => a.passed);
  const win = windowState(mod.mes);
  let estado;
  if (passed) estado = 'aprobado';
  else if (attempts.length >= MAX_ATTEMPTS) estado = 'no_aprobado';
  else if (win === 'cerrado') estado = 'cerrado';
  else if (win === 'proximo') estado = 'proximo';
  else estado = attempts.length ? 'reintento' : read ? 'listo' : 'estudiando';
  const canTake = win === 'abierto' && !passed && attempts.length < MAX_ATTEMPTS && Boolean(read);
  return { attempts, read: Boolean(read), passed, win, estado, canTake, best: attempts.reduce((m, a) => Math.max(m, a.score), 0) };
}

export function grade(mod, input) {
  const answers = mod.preguntas.map((_, i) => (input[`p${i}`] === undefined ? null : Number(input[`p${i}`])));
  const ok = mod.preguntas.map((p, i) => answers[i] === p.correcta);
  const score = Math.round((ok.filter(Boolean).length / mod.preguntas.length) * 100);
  return { answers, ok, score, passed: score >= PASS };
}

// Aviso de apertura (día 1) y recordatorio (desde el día 24) a quienes aún no aprueban
export async function studyNotifications(baseUrl) {
  if (!mailConfigured()) return 0;
  const mes = thisMonth();
  const day = Number(new Date().toLocaleDateString('en-CA', { timeZone: TZ }).slice(8, 10));
  let n = 0;
  for (const m of (await q('SELECT * FROM study_modules WHERE published AND mes = $1', [mes])).rows) {
    const people = (await q("SELECT id, email, name FROM users WHERE role = 'staff' AND active AND approved AND area = $1", [m.area])).rows;
    const send = async (p, subject, body) => {
      const first = (p.name || '').split(' ')[0].replace(/[<>&"]/g, '');
      await sendMail(p.email, subject, `${body}\n\n${baseUrl}/estudio/${m.id}`, `<div style="font-family:Arial,sans-serif;color:#041E42;max-width:520px;margin:auto;padding:24px"><p>Hola ${first},</p><p>${body}</p><p style="margin:24px 0"><a href="${baseUrl}/estudio/${m.id}" style="background:#041E42;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Ir al módulo</a></p><p style="color:#706F6F;font-size:12px">Tienes hasta el ${lastDay(mes)} de este mes · 2 intentos · se aprueba con 85%.</p></div>`);
      n++;
    };
    if (!m.notified_at) {
      for (const p of people) await send(p, `Nuevo módulo de estudio: ${m.titulo}`, `Ya está disponible tu módulo del mes: "${m.titulo}". ${m.objetivo}`).catch((e) => console.error('estudio', e.message));
      await q('UPDATE study_modules SET notified_at = now() WHERE id = $1', [m.id]);
    } else if (day >= 24 && !m.reminded_at) {
      for (const p of people) {
        if (await one('SELECT 1 FROM study_attempts WHERE user_id = $1 AND module_id = $2 AND passed', [p.id, m.id])) continue;
        const used = (await one('SELECT count(*)::int AS c FROM study_attempts WHERE user_id = $1 AND module_id = $2', [p.id, m.id])).c;
        if (used >= MAX_ATTEMPTS) continue;
        await send(p, `Te quedan ${lastDay(mes) - day + 1} días para tu módulo`, `Recuerda completar el módulo "${m.titulo}" antes de que termine el mes.`).catch((e) => console.error('estudio', e.message));
      }
      await q('UPDATE study_modules SET reminded_at = now() WHERE id = $1', [m.id]);
    }
  }
  return n;
}
