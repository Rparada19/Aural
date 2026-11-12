import { createClient } from '@supabase/supabase-js';

/** Cliente con service role. Solo en servidor y después de validar permisos. */
export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}

/** Personas que pueden atender casos: servicio al cliente y coordinación. */
export async function caseHandlers() {
  const { data } = await serviceClient()
    .from('profiles')
    .select('id, full_name, admin_role, is_admin, wholesale_blocked')
    .or('admin_role.in.(wholesale_assistant,wholesale_coordinator),is_admin.eq.true')
    .is('deleted_at', null);
  return (data ?? [])
    .filter((p) => !p.wholesale_blocked)
    .map((p) => ({ id: p.id as string, name: p.full_name as string }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
