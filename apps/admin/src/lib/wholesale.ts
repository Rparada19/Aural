import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createSupabaseServerClient } from './supabase/server';

import { type WholesaleRole, can, type Permissions, type ModuleKey, MODULES, modulesFor } from './wholesale-roles';

export interface WholesaleMe {
  id: string;
  full_name: string;
  role: WholesaleRole;
  /** Para pintar: admin y coordinación ven lo mismo salvo configuración */
  isCoordination: boolean;
  can: Permissions;
  repId: string | null;
  email: string | null;
  modules: ModuleKey[];
}

/** Resuelve quién es el usuario dentro del mercado wholesale.
 *  El admin y el coordinador ven todo; el comercial solo su cartera. */
export const getWholesaleMe = cache(async (): Promise<WholesaleMe | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, is_admin, admin_role, linked_wholesale_rep_id, wholesale_blocked, wholesale_modules')
    .eq('id', user.id)
    .single();
  if (!data) return null;

  const role: WholesaleRole | null =
    data.is_admin === true ? 'admin'
    : data.admin_role === 'wholesale_coordinator' ? 'coordinator'
    : data.admin_role === 'wholesale_rep' ? 'rep'
    : data.admin_role === 'wholesale_assistant' ? 'assistant'
    : null;
  if (!role) return null;
  // Un usuario bloqueado por coordinación no entra; el administrador nunca se bloquea
  if (role !== 'admin' && data.wholesale_blocked) return null;

  return {
    id: data.id,
    full_name: data.full_name,
    role,
    isCoordination: role === 'admin' || role === 'coordinator',
    can: can(role),
    repId: data.linked_wholesale_rep_id ?? null,
    email: user.email ?? null,
    modules: modulesFor(role, data.wholesale_modules),
  };
});

/** Exige sesión en wholesale y, si se indica, acceso a la sección. */
export async function requireWholesaleMe(module?: ModuleKey): Promise<WholesaleMe> {
  const me = await getWholesaleMe();
  if (!me) redirect('/login?sin-acceso=1');
  if (module && !me.modules.includes(module)) redirect(homeFor(me));
  return me;
}

/** Primera sección que la persona tiene habilitada. */
export function homeFor(me: WholesaleMe): string {
  if (me.role === 'assistant' && me.modules.includes('casos')) return '/wholesale/casos';
  const first = MODULES.find((m) => me.modules.includes(m.key));
  return first ? first.href : '/wholesale/perfil';
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
