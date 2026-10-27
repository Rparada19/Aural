import Anthropic from '@anthropic-ai/sdk';
import { q, one } from './db.js';
import { AREAS } from './areas.js';
import { notifyReportReady } from './notify.js';

const MODEL = process.env.ANALYSIS_MODEL || 'claude-opus-5-5';

const REPORT_TOOL = {
  name: 'entregar_informe',
  description: 'Entrega el informe de evaluación del profesional.',
  input_schema: {
    type: 'object',
    required: ['resumen', 'puntaje_global', 'modulos', 'fortalezas', 'oportunidades', 'plan'],
    properties: {
      resumen: { type: 'string', description: 'Conclusión general para el líder, 4-6 frases, concreta y basada en evidencia de las respuestas.' },
      puntaje_global: { type: 'integer', minimum: 0, maximum: 100 },
      nivel: { type: 'string', enum: ['Inicial', 'En desarrollo', 'Competente', 'Destacado'] },
      modulos: {
        type: 'array',
        items: {
          type: 'object', required: ['modulo', 'puntaje', 'comentario'],
          properties: { modulo: { type: 'string' }, puntaje: { type: 'integer', minimum: 0, maximum: 100 }, comentario: { type: 'string' } },
        },
      },
      fortalezas: {
        type: 'array', minItems: 3, maxItems: 5,
        items: { type: 'object', required: ['titulo', 'evidencia'], properties: { titulo: { type: 'string' }, evidencia: { type: 'string', description: 'Qué respuesta lo demuestra' } } },
      },
      oportunidades: {
        type: 'array', minItems: 3, maxItems: 5,
        items: { type: 'object', required: ['titulo', 'evidencia', 'impacto'], properties: { titulo: { type: 'string' }, evidencia: { type: 'string' }, impacto: { type: 'string', description: 'Efecto en el paciente o la operación' } } },
      },
      alertas: { type: 'array', items: { type: 'string' }, description: 'Riesgos que requieren atención inmediata (seguridad del paciente, datos personales, trato). Vacío si no hay.' },
      autopercepcion: { type: 'string', description: 'Contraste entre su autoevaluación (escalas) y lo que muestran sus respuestas.' },
      plan: {
        type: 'object', required: ['objetivo', 'semanas', 'sesiones_1a1', 'mensaje'],
        properties: {
          objetivo: { type: 'string', description: 'Objetivo del plan en una frase, dirigido al profesional.' },
          semanas: {
            type: 'array', minItems: 4, maxItems: 8,
            items: {
              type: 'object', required: ['semana', 'foco', 'acciones', 'indicador'],
              properties: { semana: { type: 'string', description: 'Ej: Semanas 1-2' }, foco: { type: 'string' }, acciones: { type: 'array', items: { type: 'string' } }, indicador: { type: 'string', description: 'Cómo sabremos que avanzó' } },
            },
          },
          sesiones_1a1: {
            type: 'array', minItems: 3, maxItems: 6,
            items: { type: 'object', required: ['tema', 'preguntas_guia'], properties: { tema: { type: 'string' }, preguntas_guia: { type: 'array', items: { type: 'string' } } } },
          },
          mensaje: { type: 'string', description: 'Mensaje cálido y motivador dirigido al profesional (tuteo), 3-4 frases, sin mencionar puntajes.' },
        },
      },
    },
  },
};

function formatAnswers(questions, answers) {
  return questions.map((qu, i) => {
    const a = answers[qu.id];
    let ans = '(sin respuesta)';
    let check = '';
    if (qu.type === 'open') ans = a || ans;
    else if (qu.type === 'scale') ans = a ? `${a}/5 (${qu.options[a - 1]})` : ans;
    else if (qu.type === 'single') {
      ans = a !== undefined && a !== null && a !== '' ? qu.options[a] : ans;
      if (qu.correct !== null && qu.correct !== undefined) check = Number(a) === qu.correct ? ' ✔ correcta' : ` ✘ esperada: "${qu.options[qu.correct]}"`;
    } else if (qu.type === 'multi') {
      const sel = (a || []).map(Number);
      ans = sel.length ? sel.map((x) => qu.options[x]).join(' | ') : ans;
      if (Array.isArray(qu.correct)) {
        const ok = qu.correct.length === sel.length && qu.correct.every((x) => sel.includes(x));
        check = ok ? ' ✔ correcta' : ` ✘ esperadas: ${qu.correct.map((x) => `"${qu.options[x]}"`).join(', ')}`;
      }
    }
    const opts = qu.options && qu.type !== 'scale' ? `\n   Opciones: ${qu.options.join(' / ')}` : '';
    return `${i + 1}. [${qu.module} · ${qu.type}] ${qu.text}${opts}\n   Respuesta: ${ans}${check}`;
  }).join('\n\n');
}

export async function analyze(evaluationId) {
  const ev = await one('SELECT e.*, u.name, u.cargo, u.sede FROM evaluations e JOIN users u ON u.id = e.user_id WHERE e.id = $1', [evaluationId]);
  if (!ev) return;
  if (!process.env.ANTHROPIC_API_KEY) {
    await q("UPDATE evaluations SET report_error = 'Falta configurar ANTHROPIC_API_KEY' WHERE id = $1", [evaluationId]);
    return;
  }
  const area = AREAS[ev.area] || { label: 'Servicio al cliente', rol: 'Atención a pacientes y clientes.', criterios: 'calidad de atención, comunicación, procesos y criterio.' };
  await q("UPDATE evaluations SET status = 'analizando', report_error = NULL WHERE id = $1", [evaluationId]);
  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: `Eres un consultor experto en experiencia de paciente y servicio al cliente en salud auditiva. Evalúas a profesionales de Aural Colombia, distribuidor exclusivo de audífonos Widex en Colombia, con sedes de atención a pacientes y un canal mayorista de aliados.
Área evaluada: ${area.label}.
Qué hace este rol: ${area.rol}
Criterios clave para esta área: ${area.criterios}
Analiza con rigor y justicia: basa cada conclusión en evidencia textual de las respuestas, valora la calidad de las respuestas abiertas según los criterios del área, contrasta la autoevaluación con el desempeño real, y señala con claridad cualquier riesgo para el paciente o para el manejo de datos personales.
El plan de trabajo debe ser específico para este rol (no genérico), práctico, alcanzable en 8 semanas, con acciones del día a día y pensado para acompañarse en sesiones uno a uno con el líder. Escribe en español de Colombia, tono profesional y amable.`,
      tools: [REPORT_TOOL],
      tool_choice: { type: 'tool', name: 'entregar_informe' },
      messages: [{
        role: 'user',
        content: `Área: ${area.label}\nProfesional: ${ev.name || 'Sin nombre'}${ev.cargo ? ` · Cargo: ${ev.cargo}` : ''}${ev.sede ? ` · Sede: ${ev.sede}` : ''}\n\nRespuestas de la evaluación:\n\n${formatAnswers(ev.questions, ev.answers)}`,
      }],
    });
    const tool = res.content.find((c) => c.type === 'tool_use');
    if (!tool) throw new Error('La respuesta no trajo informe');
    await q("UPDATE evaluations SET report = $2, status = 'analizada', analyzed_at = now() WHERE id = $1", [evaluationId, JSON.stringify(tool.input)]);
    notifyReportReady(evaluationId).catch((e) => console.error('aviso resultados', e.message));
  } catch (e) {
    console.error('analyze', evaluationId, e);
    await q("UPDATE evaluations SET status = 'enviada', report_error = $2 WHERE id = $1", [evaluationId, String(e.message || e).slice(0, 500)]);
  }
}

export { formatAnswers };
