import { createSupabaseServerClient } from './supabase/server';

export type AdminRole = 'coordinator' | 'csr' | 'visitor_rep' | null;

export interface AdminMe {
  id: string;
  full_name: string;
  admin_role: AdminRole;
  is_admin: boolean;
  linked_visitor_id: string | null;
}

export async function getAdminMe(): Promise<AdminMe | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, is_admin, admin_role, linked_visitor_id')
    .eq('id', user.id)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    full_name: data.full_name,
    admin_role: (data.admin_role ?? null) as AdminRole,
    is_admin: data.is_admin ?? false,
    linked_visitor_id: data.linked_visitor_id ?? null,
  };
}

export function hasAccess(me: AdminMe | null): boolean {
  if (!me) return false;
  return me.is_admin || me.admin_role !== null;
}

export function isCoordinator(me: AdminMe | null): boolean {
  return !!me && (me.is_admin || me.admin_role === 'coordinator');
}

export function isCsr(me: AdminMe | null): boolean {
  return me?.admin_role === 'csr';
}

export function isVisitorRep(me: AdminMe | null): boolean {
  return me?.admin_role === 'visitor_rep';
}
