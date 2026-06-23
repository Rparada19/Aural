'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function ensureAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, admin_role').eq('id', user.id).single();
  if (!me?.is_admin && me?.admin_role !== 'coordinator' && me?.admin_role !== 'csr') {
    throw new Error('Sin permisos');
  }
  return { supabase, adminId: user.id };
}

export async function updateProfessional(userId: string, patch: {
  full_name?: string;
  cedula?: string;
  phone?: string;
  city?: string;
  profession?: string;
  address?: string;
}) {
  const { supabase, adminId } = await ensureAdmin();
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: patch.full_name,
      cedula: patch.cedula,
      phone: patch.phone,
      city: patch.city,
      profession: patch.profession,
      address: patch.address,
    })
    .eq('id', userId);
  if (error) throw error;
  await supabase.from('audit_logs').insert({
    actor_id: adminId,
    action: 'update_professional',
    entity: 'profiles',
    entity_id: userId,
    diff: patch,
  });
  revalidatePath(`/users/${userId}`);
}
