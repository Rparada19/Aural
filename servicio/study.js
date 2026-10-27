import { createWithTool } from './ai.js';
import { q, one } from './db.js';
import { AREAS } from './areas.js';

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
  const planned = await one("SELECT numero, titulo, objetivo FROM study_modules WHERE area = $1 AND mes = $2 AND numero IS NOT NULL", [area, mes]);
  if (planned && !tema) tema = `Módulo ${planned.numero} de 12 de la Academia: "${planned.titulo}". Objetivo: ${planned.objetivo}. Mantén este tema y este enfoque.`;
  const prev = (await q('SELECT mes, titulo FROM study_modules WHERE area = $1 AND mes <> $2 ORDER BY mes', [area, mes])).rows;
  const gaps = (await q(`SELECT o->>'titulo' AS t, count(*)::int AS n FROM evaluations e JOIN users u ON u.id = e.user_id,
      jsonb_array_elements(e.report->'oportunidades') o WHERE u.area = $1 AND e.report IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 12`, [area])).rows;
  const res = await createWithTool({
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
    ON CONFLICT (area, mes) DO UPDATE SET titulo = CASE WHEN study_modules.numero IS NULL THEN EXCLUDED.titulo ELSE study_modules.titulo END, objetivo = CASE WHEN study_modules.numero IS NULL THEN EXCLUDED.objetivo ELSE study_modules.objetivo END, secciones = EXCLUDED.secciones, preguntas = EXCLUDED.preguntas RETURNING id`,
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

// ---------- Academia: ruta de 12 módulos ----------
const ROUTE_TOOL = {
  name: 'ruta_academia',
  description: 'Entrega la ruta de 12 módulos de la Academia para un área.',
  input_schema: {
    type: 'object', required: ['modulos'],
    properties: {
      modulos: {
        type: 'array', minItems: 12, maxItems: 12,
        items: { type: 'object', required: ['titulo', 'objetivo'], properties: { titulo: { type: 'string', description: 'Máximo 8 palabras' }, objetivo: { type: 'string', description: 'Qué será capaz de hacer al terminar, una frase' } } },
      },
    },
  },
};

const addMonths = (mes, k) => { const d = new Date(`${mes}-15T12:00:00`); d.setMonth(d.getMonth() + k); return d.toISOString().slice(0, 7); };

export async function generateAcademy(area, inicio) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta configurar ANTHROPIC_API_KEY');
  const a = AREAS[area];
  const gaps = (await q(`SELECT o->>'titulo' AS t, count(*)::int AS n FROM evaluations e JOIN users u ON u.id = e.user_id,
      jsonb_array_elements(e.report->'oportunidades') o WHERE u.area = $1 AND e.report IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 15`, [area])).rows;
  const res = await createWithTool({
    model: MODEL, max_tokens: 4000,
    system: `Eres un diseñador instruccional experto en servicio y salud auditiva. Diseñas la Academia Aural: una ruta de 12 módulos mensuales, de lo fundamental a lo avanzado, para el área "${a.label}" de Aural Colombia (distribuidor exclusivo de audífonos Widex). Rol: ${a.rol} Criterios de excelencia: ${a.criterios} Español de Colombia.`,
    tools: [ROUTE_TOOL], tool_choice: { type: 'tool', name: 'ruta_academia' },
    messages: [{ role: 'user', content: `Diseña los 12 módulos en orden. Prioriza estas oportunidades de mejora detectadas en las evaluaciones del área: ${gaps.map((g) => `${g.t} (${g.n})`).join('; ') || 'aún no hay evaluaciones; usa los criterios del área'}.` }],
  });
  const t = res.content.find((c) => c.type === 'tool_use');
  if (!t) throw new Error('La IA no devolvió la ruta');
  for (const [i, m] of t.input.modulos.entries()) {
    await q(`INSERT INTO study_modules (area, mes, numero, titulo, objetivo) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (area, mes) DO UPDATE SET numero = EXCLUDED.numero, titulo = CASE WHEN jsonb_array_length(study_modules.secciones) = 0 THEN EXCLUDED.titulo ELSE study_modules.titulo END,
        objetivo = CASE WHEN jsonb_array_length(study_modules.secciones) = 0 THEN EXCLUDED.objetivo ELSE study_modules.objetivo END`, [area, addMonths(inicio, i), i + 1, m.titulo, m.objetivo]);
  }
}

// Prepara el contenido del módulo del mes siguiente (desde el día 15) y publica el del mes al iniciar
export async function academyAutomation(notifyAdmins) {
  const mes = thisMonth();
  const day = Number(new Date().toLocaleDateString('en-CA', { timeZone: TZ }).slice(8, 10));
  const out = { preparados: 0, publicados: 0 };
  if (day >= 15 && process.env.ANTHROPIC_API_KEY) {
    for (const m of (await q("SELECT id, area, mes, titulo FROM study_modules WHERE numero IS NOT NULL AND mes = $1 AND jsonb_array_length(secciones) = 0", [addMonths(mes, 1)])).rows) {
      try { await generateModule(m.area, m.mes); out.preparados++; await notifyAdmins?.(m); } catch (e) { console.error('academia', m.id, e.message); }
    }
  }
  for (const m of (await q("UPDATE study_modules SET published = true WHERE numero IS NOT NULL AND mes = $1 AND NOT published AND auto_publish AND jsonb_array_length(secciones) > 0 AND jsonb_array_length(preguntas) >= 5 RETURNING id", [mes])).rows) out.publicados++;
  return out;
}
