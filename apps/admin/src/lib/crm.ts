export const STAGES = [
  'identificado', 'contactado', 'visitado', 'demo', 'propuesta', 'negociacion', 'ganado', 'perdido',
] as const;
export type Stage = (typeof STAGES)[number];

export const OPEN_STAGES: Stage[] = ['identificado', 'contactado', 'visitado', 'demo', 'propuesta', 'negociacion'];

export const STAGE_LABEL: Record<Stage, string> = {
  identificado: 'Identificado',
  contactado: 'Contactado',
  visitado: 'Visitado',
  demo: 'Demo o prueba',
  propuesta: 'Propuesta',
  negociacion: 'Negociación',
  ganado: 'Ganado',
  perdido: 'Perdido',
};

/** Probabilidad sugerida por etapa, si nadie la fija a mano. */
export const STAGE_PROB: Record<Stage, number> = {
  identificado: 5, contactado: 10, visitado: 25, demo: 40, propuesta: 60, negociacion: 80, ganado: 100, perdido: 0,
};

export const KIND_LABEL: Record<string, string> = {
  cuenta_nueva: 'Cuenta nueva',
  contrato_volumen: 'Contrato por volumen',
  reactivacion: 'Reactivación',
  ampliacion: 'Ampliación',
};

export const INTERACTION_LABEL: Record<string, string> = {
  llamada: 'Llamada', whatsapp: 'WhatsApp', visita: 'Visita', virtual: 'Reunión virtual',
  correo: 'Correo', demo: 'Demo', evento: 'Evento',
};

export const OUTCOME_LABEL: Record<string, string> = {
  avanza: 'Avanza', neutral: 'Sin cambio', frena: 'Se frena',
};

export const INFLUENCE_LABEL: Record<string, string> = {
  decide: 'Decide', influye: 'Influye', usa: 'Usa el producto',
};

export const SENTIMENT_LABEL: Record<string, string> = {
  a_favor: 'A favor', neutral: 'Neutral', en_contra: 'En contra',
};

export const SOURCES = ['Referido', 'Visita en frío', 'Evento', 'Redes o web', 'Médico', 'Base de datos', 'Otro'];

export const LOST_REASONS = ['Precio', 'Competencia', 'No es el momento', 'Sin respuesta', 'No califica', 'Otro'];

export function prob(o: { probability: number | null; stage: Stage }) {
  return o.probability ?? STAGE_PROB[o.stage];
}

export function today() {
  return new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
}

export function daysSince(date: string | null) {
  if (!date) return null;
  return Math.floor((Date.parse(today()) - Date.parse(date.slice(0, 10))) / 86_400_000);
}
