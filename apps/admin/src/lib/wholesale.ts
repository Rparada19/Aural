import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';

export interface WholesaleMe {
  id: string;
  full_name: string;
  role: 'coordinator' | 'rep';
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

  const isCoordinator = data.is_admin === true || data.admin_role === 'wholesale_coordinator';
  const isRep = data.admin_role === 'wholesale_rep';
  if (!isCoordinator && !isRep) return null;

  return {
    id: data.id,
    full_name: data.full_name,
    role: isCoordinator ? 'coordinator' : 'rep',
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
