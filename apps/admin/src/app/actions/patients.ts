'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function ensureAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) throw new Error('No autorizado');
  return { supabase, adminId: user.id };
}

export async function createPatient(professionalId: string, input: {
  full_name: string;
  cedula: string;
  phone: string;
  email?: string | null;
  city_id?: string | null;
  notes?: string | null;
  visitor_id?: string | null;
  location_id?: string | null;
  audiologist_id?: string | null;
  case_type?: string | null;
}) {
  const { supabase } = await ensureAdmin();

  const { data: origin } = await supabase
    .from('patient_origins').select('id').eq('name', 'Visita médica').maybeSingle();

  const { data, error } = await supabase
    .from('patients')
    .insert({
      professional_id: professionalId,
      full_name: input.full_name,
      cedula: input.cedula,
      phone: input.phone,
      email: input.email || null,
      city_id: input.city_id || null,
      notes: input.notes || null,
      visitor_id: input.visitor_id || null,
      location_id: input.location_id || null,
      audiologist_id: input.audiologist_id || null,
      case_type: input.case_type || 'sale_candidate',
      origin_id: origin?.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath(`/users/${professionalId}`);
  return data;
}

export async function updatePatient(patientId: string, professionalId: string, patch: Record<string, unknown>) {
  const { supabase } = await ensureAdmin();
  const { error } = await supabase.from('patients').update(patch).eq('id', patientId);
  if (error) throw error;
  revalidatePath(`/users/${professionalId}/patients/${patientId}`);
}

export async function markLeadAsManaged(patientId: string) {
  const { supabase, adminId } = await ensureAdmin();
  const { error } = await supabase
    .from('patients')
    .update({ funnel_status: 'contacted' })
    .eq('id', patientId);
  if (error) throw error;
  await supabase.from('audit_logs').insert({
    actor_id: adminId,
    action: 'lead_managed',
    entity: 'patients',
    entity_id: patientId,
  });
  revalidatePath('/');
  revalidatePath('/patients');
}

export async function addClinicalNote(patientId: string, professionalId: string, body: string) {
  const { supabase, adminId } = await ensureAdmin();
  const { error } = await supabase.from('patient_notes').insert({
    patient_id: patientId, author_id: adminId, body,
  });
  if (error) throw error;
  revalidatePath(`/users/${professionalId}/patients/${patientId}`);
}

export async function addFollowup(patientId: string, professionalId: string, input: {
  comment: string; next_action?: string; next_action_at?: string;
}) {
  const { supabase, adminId } = await ensureAdmin();
  const { error } = await supabase.from('patient_followups').insert({
    patient_id: patientId,
    author_id: adminId,
    comment: input.comment,
    next_action: input.next_action || null,
    next_action_at: input.next_action_at || null,
  });
  if (error) throw error;
  revalidatePath(`/users/${professionalId}/patients/${patientId}`);
}
