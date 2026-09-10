export interface ActivityType {
  slug: string;
  label: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

/** Ícono por defecto cuando un tipo se borró del catálogo pero quedan
 *  actividades viejas apuntando a él. */
export const FALLBACK_ICON = '📌';

const DAY_MS = 86_400_000;

/** Lunes de la semana que contiene la fecha dada, en formato YYYY-MM-DD. */
export function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay(); // 0 domingo … 6 sábado
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function weekDays(mondayIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayIso, i));
}

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function formatDayLabel(iso: string): string {
  return String(Number(iso.slice(8, 10)));
}

/** Rango de fechas que cubre cada vista de la agenda. */
export type AgendaView = 'day' | 'week' | 'month';

export function agendaRange(view: AgendaView, anchor: string): { from: string; to: string } {
  if (view === 'day') return { from: anchor, to: anchor };
  if (view === 'week') {
    const from = mondayOf(new Date(`${anchor}T00:00:00Z`));
    return { from, to: addDays(from, 6) };
  }
  const [y, m] = anchor.split('-').map(Number);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from, to: `${y}-${String(m).padStart(2, '0')}-${last}` };
}

/** Días de la grilla mensual: semanas completas de lunes a domingo. */
export function monthGrid(anchor: string): string[] {
  const { from, to } = agendaRange('month', anchor);
  const start = mondayOf(new Date(`${from}T00:00:00Z`));
  const days: string[] = [];
  let cursor = start;
  while (cursor <= to || days.length % 7 !== 0) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
    if (days.length > 42) break;
  }
  return days;
}

export function shiftAnchor(view: AgendaView, anchor: string, dir: 1 | -1): string {
  if (view === 'day') return addDays(anchor, dir);
  if (view === 'week') return addDays(anchor, 7 * dir);
  const [y, m] = anchor.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + dir, 1));
  return d.toISOString().slice(0, 10);
}

/** Último día real del mes. Usar siempre esto para cerrar un rango:
 *  Postgres rechaza '2026-09-31' con date/time field value out of range. */
export function monthEnd(year: number, month: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${last}`;
}

export function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
