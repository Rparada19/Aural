// Aprendizaje colectivo: la IA lee las respuestas de todo el equipo de un área y extrae
// las mejores respuestas, la respuesta modelo de cada pregunta y los temas más fuertes y más débiles.
import { q, one } from './db.js';
import { AREAS } from './areas.js';
import { createWithTool } from './ai.js';

const MODEL = process.env.ANALYSIS_MODEL || 'claude-opus-5-5';
const PER_Q = 12;
const MAX_CHARS = 450;

const TOOL = {
  name: 'aprendizaje_equipo',
  description: 'Entrega lo aprendido de las respuestas del equipo.',
  input_schema: {
    type: 'object', required: ['resumen', 'temas', 'preguntas'],
    properties: {
      resumen: { type: 'string', description: 'Qué aprendimos del equipo en 3-4 frases' },
      temas: {
        type: 'array', minItems: 4, maxItems: 12,
        items: { type: 'object', required: ['tema', 'tipo', 'peso', 'detalle'], properties: {
          tema: { type: 'string', description: 'Máximo 5 palabras' },
          tipo: { type: 'string', enum: ['fortaleza', 'brecha'] },
          peso: { type: 'integer', minimum: 1, maximum: 10, description: 'Qué tan presente está en el equipo' },
          detalle: { type: 'string', description: 'Una frase con la evidencia' },
        } },
      },
      preguntas: {
        type: 'array',
        items: { type: 'object', required: ['id', 'respuesta_modelo', 'mejores', 'errores_comunes'], properties: {
          id: { type: 'integer', description: 'id de la pregunta' },
          respuesta_modelo: { type: 'string', description: 'La mejor respuesta posible, redactada combinando lo mejor del equipo, lista para enseñar (3-6 frases)' },
          mejores: { type: 'array', maxItems: 2, items: { type: 'object', required: ['ref', 'por_que'], properties: { ref: { type: 'string', description: 'Código de la respuesta, por ejemplo R3' }, por_que: { type: 'string' } } } },
          errores_comunes: { type: 'array', maxItems: 3, items: { type: 'string' } },
        } },
      },
    },
  },
};

export async function learnArea(area) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Falta configurar ANTHROPIC_API_KEY');
  const { rows: evs } = await q(`SELECT e.id, e.questions, e.answers, (e.report->>'puntaje_global')::int AS score, u.id AS uid, u.name
    FROM users u JOIN LATERAL (SELECT * FROM evaluations WHERE user_id = u.id AND status IN ('enviada','analizando','analizada') ORDER BY id DESC LIMIT 1) e ON true
    WHERE u.role = 'staff' AND u.approved AND u.area = $1`, [area]);
  if (evs.length < 2) throw new Error('Se necesitan al menos 2 evaluaciones enviadas en el área para aprender');
  const qs = new Map();
  for (const e of evs) for (const qu of e.questions) if (qu.type === 'open') {
    const a = String(e.answers?.[qu.id] || '').trim();
    if (a.length < 15) continue;
    if (!qs.has(qu.id)) qs.set(qu.id, { qu, answers: [] });
    qs.get(qu.id).answers.push({ uid: e.uid, name: e.name, score: e.score, text: a.slice(0, MAX_CHARS) });
  }
  const refs = {};
  let n = 0, total = 0;
  const blocks = [...qs.values()].map(({ qu, answers }) => {
    answers.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const pick = answers.slice(0, PER_Q);
    total += answers.length;
    return `### Pregunta ${qu.id} [${qu.module}]: ${qu.text}\n${pick.map((a) => { const r = `R${++n}`; refs[r] = { uid: a.uid, name: a.name, qid: qu.id, text: a.text }; return `${r}: ${a.text}`; }).join('\n')}`;
  });
  if (!blocks.length) throw new Error('Aún no hay respuestas abiertas suficientes');
  const a = AREAS[area];
  const res = await createWithTool({
    model: MODEL, max_tokens: 12000,
    system: `Eres un experto en servicio y salud auditiva de Aural Colombia (audífonos Widex). Lees las respuestas abiertas de todo el equipo del área "${a.label}" a su evaluación de servicio para aprender de ellas: identificar las mejores respuestas, construir la respuesta modelo de cada pregunta combinando lo mejor del equipo, detectar errores comunes y los temas en los que el equipo es fuerte o débil. Criterios de excelencia del área: ${a.criterios} Sé justo y concreto. Español de Colombia.`,
    tools: [TOOL], tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: `Respuestas del equipo (cada una con un código):\n\n${blocks.join('\n\n')}` }],
  });
  const t = res.content.find((c) => c.type === 'tool_use');
  if (!t) throw new Error('La IA no devolvió el aprendizaje');
  const out = t.input;
  for (const p of out.preguntas || []) {
    const src = qs.get(p.id);
    p.pregunta = src?.qu.text || '';
    p.modulo = src?.qu.module || '';
    p.respuestas = src?.answers.length || 0;
    p.mejores = (p.mejores || []).map((m) => ({ ...m, ...(refs[m.ref] || {}) })).filter((m) => m.text);
  }
  await q('INSERT INTO knowledge (area, data, evaluaciones, respuestas) VALUES ($1,$2,$3,$4)', [area, JSON.stringify(out), evs.length, total]);
  return out;
}

export const latestKnowledge = (area) => one('SELECT * FROM knowledge WHERE area = $1 ORDER BY id DESC LIMIT 1', [area]);

// Resumen corto para alimentar la Academia y los planes
export async function knowledgeContext(area) {
  const k = await latestKnowledge(area);
  if (!k) return '';
  const d = k.data;
  const temas = (d.temas || []).map((t) => `${t.tema} (${t.tipo}, ${t.peso}/10)`).join('; ');
  const modelos = (d.preguntas || []).slice(0, 8).map((p) => `- ${p.pregunta}\n  Respuesta modelo del equipo: ${p.respuesta_modelo}`).join('\n');
  return `Aprendizaje de las respuestas del equipo: ${d.resumen}\nTemas: ${temas}\nMejores prácticas del propio equipo:\n${modelos}`;
}

// Reaprende cada semana en las áreas con evaluaciones nuevas
export async function relearnIfNew() {
  let n = 0;
  for (const area of Object.keys(AREAS)) {
    const last = await latestKnowledge(area);
    const fresh = await one(`SELECT count(*)::int AS c FROM evaluations e JOIN users u ON u.id = e.user_id
      WHERE u.area = $1 AND e.status IN ('enviada','analizando','analizada') AND e.submitted_at > coalesce($2::timestamptz, 'epoch')`, [area, last?.created_at || null]);
    if (!fresh.c || (last && Date.now() - new Date(last.created_at) < 6 * 86400e3)) continue;
    try { await learnArea(area); n++; } catch (e) { console.error('aprendizaje', area, e.message); }
  }
  return n;
}
