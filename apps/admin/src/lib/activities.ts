export type ActivityKind =
  | 'presencial' | 'virtual' | 'viaje' | 'capacitacion' | 'jornada' | 'llamada' | 'whatsapp';

export const ACTIVITY_KINDS: { kind: ActivityKind; label: string; short: string; icon: string }[] = [
  { kind: 'presencial',   label: 'Visita presencial', short: 'Presencial',   icon: '🤝' },
  { kind: 'virtual',      label: 'Visita virtual',    short: 'Virtual',      icon: '💻' },
  { kind: 'viaje',        label: 'Viaje',             short: 'Viajes',       icon: '✈️' },
  { kind: 'capacitacion', label: 'Capacitación',      short: 'Capacitación', icon: '🎓' },
  { kind: 'jornada',      label: 'Jornada',           short: 'Jornadas',     icon: '📣' },
  { kind: 'llamada',      label: 'Llamada',           short: 'Llamadas',     icon: '📞' },
  { kind: 'whatsapp',     label: 'WhatsApp',          short: 'WhatsApp',     icon: '💬' },
];

export const KIND_LABEL = Object.fromEntries(
  ACTIVITY_KINDS.map((k) => [k.kind, k.label]),
) as Record<ActivityKind, string>;

export const KIND_ICON = Object.fromEntries(
  ACTIVITY_KINDS.map((k) => [k.kind, k.icon]),
) as Record<ActivityKind, string>;

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
