'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

async function ensureAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) throw new Error('No autorizado');
  return { supabase, adminId: user.id };
}

export async function approveUser(userId: string) {
  const { supabase, adminId } = await ensureAdmin();
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: adminId })
    .eq('id', userId);
  if (error) throw error;
  await supabase.from('audit_logs').insert({
    actor_id: adminId,
    action: 'approve_user',
    entity: 'profiles',
    entity_id: userId,
  });
}

export async function rejectUser(userId: string, reason: string) {
  const { supabase, adminId } = await ensureAdmin();
  const { error } = await supabase
    .from('profiles')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejected_by: adminId,
      rejection_reason: reason || null,
    })
    .eq('id', userId);
  if (error) throw error;
  await supabase.from('audit_logs').insert({
    actor_id: adminId,
    action: 'reject_user',
    entity: 'profiles',
    entity_id: userId,
    diff: { reason },
  });
}

export async function suspendUser(userId: string, reason: string) {
  const { supabase, adminId } = await ensureAdmin();
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'suspended', rejection_reason: reason || null })
    .eq('id', userId);
  if (error) throw error;
  await supabase.from('audit_logs').insert({
    actor_id: adminId,
    action: 'suspend_user',
    entity: 'profiles',
    entity_id: userId,
    diff: { reason },
  });
}

export async function assignVisitor(userId: string, visitorId: string | null) {
  const { supabase, adminId } = await ensureAdmin();
  const { error } = await supabase
    .from('profiles')
    .update({ visitor_id: visitorId })
    .eq('id', userId);
  if (error) throw error;
  await supabase.from('audit_logs').insert({
    actor_id: adminId,
    action: 'assign_visitor',
    entity: 'profiles',
    entity_id: userId,
    diff: { visitor_id: visitorId },
  });
}

export async function reactivateUser(userId: string) {
  const { supabase, adminId } = await ensureAdmin();
  const { error } = await supabase
    .from('profiles')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: adminId,
      rejection_reason: null,
    })
    .eq('id', userId);
  if (error) throw error;
  await supabase.from('audit_logs').insert({
    actor_id: adminId,
    action: 'reactivate_user',
    entity: 'profiles',
    entity_id: userId,
  });
}
