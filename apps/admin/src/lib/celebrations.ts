/** Utilidades de calendario para las celebraciones. */

export interface Celebration {
  slug: string;
  label: string;
  month: number;
  day: number;
  audience: string;
  note: string | null;
  is_active: boolean;
}

export interface Contact {
  id: string;
  client_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  birth_month: number | null;
  birth_day: number | null;
}

/** Días que faltan para el próximo mes/día, contando el salto de año. */
export function daysUntil(month: number, day: number, from = new Date()): number {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(from.getFullYear(), month - 1, day);
  if (next < today) next = new Date(from.getFullYear() + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

export function dateLabel(month: number, day: number): string {
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${day} de ${MESES[month - 1]}`;
}

/** Un saludo por año: la clave evita felicitar dos veces la misma fecha. */
export function sendKey(contactId: string | null, slug: string | null, year: number) {
  return `${contactId ?? 'cliente'}·${slug ?? 'cumpleanos'}·${year}`;
}
