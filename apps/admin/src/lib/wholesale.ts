import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';

import { type WholesaleRole, can, type Permissions } from './wholesale-roles';

export interface WholesaleMe {
  id: string;
  full_name: string;
  role: WholesaleRole;
  /** Para pintar: admin y coordinación ven lo mismo salvo configuración */
  isCoordination: boolean;
  can: Permissions;
  repId: string | null;
}

/** Resuelve quién es el usuario dentro del mercado wholesale.
 *  El admin y el coordinador ven todo; el comercial solo su cartera. */
export async function getWholesaleMe(): Promise<WholesaleMe | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, is_admin, admin_role, linked_wholesale_rep_id')
    .eq('id', user.id)
    .single();
  if (!data) return null;

  const role: WholesaleRole | null =
    data.is_admin === true ? 'admin'
    : data.admin_role === 'wholesale_coordinator' ? 'coordinator'
    : data.admin_role === 'wholesale_rep' ? 'rep'
    : null;
  if (!role) return null;

  return {
    id: data.id,
    full_name: data.full_name,
    role,
    isCoordination: role !== 'rep',
    can: can(role),
    repId: data.linked_wholesale_rep_id ?? null,
  };
}

export async function requireWholesaleMe(): Promise<WholesaleMe> {
  const me = await getWholesaleMe();
  if (!me) redirect('/login');
  return me;
}

export { cop, pct } from './format';

export interface SaleRow {
  units: number | null;
  binaural: boolean | null;
  rechargeable: boolean | null;
  style?: string | null;
  net_amount: number | string | null;
}

/** Indicadores del canal: ASP, binauralidad y recargabilidad. */
export function salesMetrics(rows: SaleRow[]) {
  const units = rows.reduce((acc, r) => acc + (r.units ?? 0), 0);
  const revenue = rows.reduce((acc, r) => acc + Number(r.net_amount ?? 0), 0);
  const binaural = rows.filter((r) => r.binaural).length;
  const rechargeable = rows.filter((r) => r.rechargeable).length;
  return {
    count: rows.length,
    units,
    revenue,
    asp: units > 0 ? revenue / units : 0,
    binauralRate: rows.length > 0 ? binaural / rows.length : 0,
    rechargeableRate: rows.length > 0 ? rechargeable / rows.length : 0,
  };
}

/** Reparto por estilo (RIC, BTE, intracanal) en porcentaje de ventas. */
export function styleMix(rows: SaleRow[]): Record<string, number> {
  const total = rows.filter((r) => r.style).length;
  if (total === 0) return {};
  const counts: Record<string, number> = {};
  for (const r of rows) {
    if (!r.style) continue;
    counts[r.style] = (counts[r.style] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).map(([k, v]) => [k, Number(((v / total) * 100).toFixed(1))]),
  );
}
