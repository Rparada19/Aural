import { supabase } from '../../lib/supabase';
import type {
  PatientGeneralInput,
  AppointmentInput,
  PatientNoteInput,
  PatientFollowupInput,
  PatientCommercialInput,
} from '@aural/shared';

export async function listPatients() {
  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, cedula, phone, city_id, funnel_status, sale_closed, case_type, created_at, updated_at, first_contact_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPatient(id: string) {
  const { data, error } = await supabase
    .from('patients')
    .select(`
      *,
      city:city_id (id, name),
      technology:technology_id (id, name),
      platform:platform_id (id, code),
      location:location_id (id, name)
    `)
    .eq('id', id)
    .single();
  if (error) {
    console.error('[getPatient]', error);
    throw error;
  }
  return data;
}

export async function createPatient(input: PatientGeneralInput, professionalId: string) {
  const { data: origin } = await supabase
    .from('patient_origins')
    .select('id')
    .eq('name', 'Visita médica')
    .maybeSingle();

  const payload = {
    professional_id: professionalId,
    full_name: input.full_name,
    cedula: input.cedula,
    phone: input.phone,
    email: input.email && input.email.length > 0 ? input.email : null,
    city_id: input.city_id ?? null,
    notes: input.notes ?? null,
    origin_id: origin?.id ?? null,
  };
  const { data, error } = await supabase.from('patients').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateAppointment(id: string, input: AppointmentInput) {
  const payload: Record<string, unknown> = {
    appointment_at: input.appointment_at ?? null,
    appointment_status: input.appointment_status,
  };
  if (input.appointment_status === 'confirmed') payload.funnel_status = 'appointment_scheduled';
  if (input.appointment_status === 'attended') payload.funnel_status = 'attended';
  const { error } = await supabase.from('patients').update(payload).eq('id', id);
  if (error) throw error;
}

export async function updateClinicalFindings(id: string, findings: string) {
  const { error } = await supabase
    .from('patients')
    .update({ clinical_findings: findings })
    .eq('id', id);
  if (error) throw error;
}

export async function updateCommercial(id: string, input: PatientCommercialInput) {
  const { error } = await supabase.from('patients').update({
    technology_id: input.technology_id ?? null,
    platform_id: input.platform_id ?? null,
    rechargeable: input.rechargeable ?? null,
    binaural: input.binaural ?? null,
    location_id: input.location_id ?? null,
    unit_price: input.unit_price ?? null,
    total_price: input.total_price ?? null,
    sale_closed: input.sale_closed,
    funnel_status: input.total_price && !input.sale_closed ? 'quoted' : undefined,
  }).eq('id', id);
  if (error) throw error;
}

export async function listNotes(patientId: string) {
  const { data, error } = await supabase
    .from('patient_notes')
    .select('id, body, created_at, author_id')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return await attachAuthors(data ?? []);
}

export async function addNote(patientId: string, authorId: string, input: PatientNoteInput) {
  const { error } = await supabase.from('patient_notes').insert({
    patient_id: patientId,
    author_id: authorId,
    body: input.body,
  });
  if (error) throw error;
}

export async function listFollowups(patientId: string) {
  const { data, error } = await supabase
    .from('patient_followups')
    .select('id, comment, next_action, next_action_at, status, created_at, author_id')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return await attachAuthors(data ?? []);
}

async function attachAuthors<T extends { author_id: string | null }>(rows: T[]) {
  const ids = Array.from(new Set(rows.map((r) => r.author_id).filter(Boolean))) as string[];
  if (ids.length === 0) return rows.map((r) => ({ ...r, author: null }));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', ids);
  const map = new Map((profiles ?? []).map((p) => [p.id, { full_name: p.full_name }]));
  return rows.map((r) => ({ ...r, author: r.author_id ? map.get(r.author_id) ?? null : null }));
}

export async function addFollowup(patientId: string, authorId: string, input: PatientFollowupInput) {
  const { error } = await supabase.from('patient_followups').insert({
    patient_id: patientId,
    author_id: authorId,
    comment: input.comment,
    next_action: input.next_action || null,
    next_action_at: input.next_action_at || null,
  });
  if (error) throw error;
}

export async function listCities() {
  const { data, error } = await supabase.from('cities').select('id, name').eq('is_active', true).order('name');
  if (error) throw error;
  return data ?? [];
}

export async function listTechnologies() {
  const { data, error } = await supabase.from('technologies').select('id, name').eq('is_active', true).order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function listPlatforms() {
  const { data, error } = await supabase.from('platforms').select('id, code').eq('is_active', true).order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function listLocations() {
  const { data, error } = await supabase.from('locations').select('id, name, city:cities(name)').eq('is_active', true).order('name');
  if (error) throw error;
  return data ?? [];
}
