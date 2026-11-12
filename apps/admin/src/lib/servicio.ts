/** Lectura del programa de servicio (servicio.auralbusinessintelligence.com):
 *  calificaciones QR, Academia, uno a uno y alarmas del equipo de la líder wholesale. */
const URL_BASE = process.env.SERVICIO_API_URL || 'https://servicio.auralbusinessintelligence.com';
const LEADER = process.env.SERVICIO_WHOLESALE_LEADER || 'mrobles@auralcolombia.com';

export interface ServicePerson {
  id: number; name: string; email: string; area: string; sede: string | null; cargo: string | null; self: boolean;
  voz: { total: number | null; mes: number | null; mes_anterior: number | null; n_mes: number; meta: number | null; por_revisar: number };
  evaluacion: { estado: string | null; puntaje: number | null };
  academia: { modulo: string | null; aprobado: boolean; intentos: number; mejor: number | null; aprobados: number | null; publicados: number | null };
  uno_a_uno: string | null;
  compromisos: { abiertos: number; vencidos: number };
  ultimo_ingreso: string | null;
  alarmas: { sev: 'alta' | 'media' | 'info' | 'logro'; t: string }[];
  ficha: string;
}

export type TeamResult =
  | { ok: true; leader: { name: string; email: string }; team: ServicePerson[] }
  | { ok: false; reason: string };

export async function serviceTeam(): Promise<TeamResult> {
  const key = process.env.SERVICIO_API_KEY;
  if (!key) return { ok: false, reason: 'Falta la variable SERVICIO_API_KEY en Vercel.' };
  try {
    const res = await fetch(`${URL_BASE}/api/equipo?lider=${encodeURIComponent(LEADER)}`, {
      headers: { 'x-api-key': key }, cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, reason: `El portal de servicio respondió ${res.status}.` };
    return { ok: true, ...(await res.json()) };
  } catch {
    return { ok: false, reason: 'No se pudo conectar con el portal de servicio.' };
  }
}

export const SERVICIO_URL = URL_BASE;
