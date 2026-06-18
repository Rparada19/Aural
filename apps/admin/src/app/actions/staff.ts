'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function ensureCoordinator() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, admin_role').eq('id', user.id).single();
  if (!me?.is_admin && me?.admin_role !== 'coordinator') throw new Error('Solo coordinador');
  return { supabase, adminId: user.id };
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function createAdminStaff(input: {
  full_name: string;
  email: string;
  password: string;
  admin_role: 'coordinator' | 'csr' | 'visitor_rep';
  linked_visitor_id?: string | null;
  phone?: string;
  city?: string;
}) {
  const { supabase, adminId } = await ensureCoordinator();
  const svc = adminClient();

  // 1. Crear usuario en auth
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      cedula: '0',
      phone: input.phone ?? '',
      city: input.city ?? '',
      profession: 'Aural',
      address: 'N/A',
      role: 'funcionario_aural',
    },
  });
  if (createErr || !created.user) throw createErr ?? new Error('No se pudo crear el usuario');

  // 2. Marcar profile como admin staff
  const { error: upErr } = await supabase
    .from('profiles')
    .update({
      admin_role: input.admin_role,
      linked_visitor_id: input.admin_role === 'visitor_rep' ? (input.linked_visitor_id || null) : null,
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: adminId,
      is_admin: input.admin_role === 'coordinator',
    })
    .eq('id', created.user.id);
  if (upErr) throw upErr;

  await supabase.from('audit_logs').insert({
    actor_id: adminId,
    action: 'create_admin_staff',
    entity: 'profiles',
    entity_id: created.user.id,
    diff: { admin_role: input.admin_role, email: input.email },
  });

  revalidatePath('/staff');
  return { id: created.user.id };
}

export async function updateAdminStaffRole(userId: string, admin_role: 'coordinator' | 'csr' | 'visitor_rep' | null, linked_visitor_id?: string | null) {
  const { supabase, adminId } = await ensureCoordinator();
  const { error } = await supabase
    .from('profiles')
    .update({
      admin_role,
      linked_visitor_id: admin_role === 'visitor_rep' ? (linked_visitor_id ?? null) : null,
      is_admin: admin_role === 'coordinator',
    })
    .eq('id', userId);
  if (error) throw error;
  await supabase.from('audit_logs').insert({
    actor_id: adminId,
    action: 'update_admin_staff_role',
    entity: 'profiles',
    entity_id: userId,
    diff: { admin_role, linked_visitor_id },
  });
  revalidatePath('/staff');
}
