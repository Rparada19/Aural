'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getWholesaleMe } from '@/lib/wholesale';

async function ensureCoordinator() {
  const me = await getWholesaleMe();
  if (!me || me.role !== 'coordinator') throw new Error('Solo coordinación wholesale');
  const supabase = await createSupabaseServerClient();
  return { supabase, me };
}

async function ensureMember() {
  const me = await getWholesaleMe();
  if (!me) throw new Error('Sin acceso a wholesale');
  const supabase = await createSupabaseServerClient();
  return { supabase, me };
}

export async function createWholesaleRep(input: {
  name: string;
  zone?: string;
  phone?: string;
  email?: string;
}) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase.from('wholesale_reps').insert({
    name: input.name,
    zone: input.zone || null,
    phone: input.phone || null,
    email: input.email || null,
  });
  if (error) throw error;
  revalidatePath('/wholesale/reps');
}

export async function createWholesaleClient(input: {
  name: string;
  nit?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  city?: string;
  zone?: string;
  rep_id?: string | null;
  notes?: string;
}) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase.from('wholesale_clients').insert({
    name: input.name,
    nit: input.nit || null,
    contact_name: input.contact_name || null,
    phone: input.phone || null,
    email: input.email || null,
    city: input.city || null,
    zone: input.zone || null,
    rep_id: input.rep_id || null,
    notes: input.notes || null,
  });
  if (error) throw error;
  revalidatePath('/wholesale/clients');
  revalidatePath('/wholesale');
}

export async function assignClientRep(clientId: string, repId: string | null) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase
    .from('wholesale_clients')
    .update({ rep_id: repId })
    .eq('id', clientId);
  if (error) throw error;
  revalidatePath('/wholesale/clients');
}

export async function createWholesaleSale(input: {
  client_id: string;
  sold_on: string;
  invoice_number?: string;
  campaign_id?: string | null;
  patient_name?: string;
  patient_document?: string;
  units: number;
  binaural: boolean;
  rechargeable: boolean;
  list_price: number;
  discount_percent: number;
}) {
  const { supabase, me } = await ensureMember();

  // El comercial solo carga sobre su propia cartera; la RLS lo vuelve a validar.
  const { data: client, error: clientErr } = await supabase
    .from('wholesale_clients')
    .select('id, rep_id')
    .eq('id', input.client_id)
    .single();
  if (clientErr || !client) throw clientErr ?? new Error('Cliente no encontrado');
  if (me.role === 'rep' && client.rep_id !== me.repId) {
    throw new Error('Ese cliente no está en tu cartera');
  }

  const net = input.list_price * input.units * (1 - input.discount_percent / 100);

  const { error } = await supabase.from('wholesale_sales').insert({
    client_id: input.client_id,
    rep_id: client.rep_id,
    sold_on: input.sold_on,
    invoice_number: input.invoice_number || null,
    campaign_id: input.campaign_id || null,
    patient_name: input.patient_name || null,
    patient_document: input.patient_document || null,
    units: input.units,
    binaural: input.binaural,
    rechargeable: input.rechargeable,
    list_price: input.list_price,
    discount_percent: input.discount_percent,
    net_amount: net,
    created_by: me.id,
  });
  if (error) throw error;

  revalidatePath('/wholesale/sales');
  revalidatePath(`/wholesale/clients/${input.client_id}`);
  revalidatePath('/wholesale');
}

export async function saveWholesaleBudgets(
  clientId: string,
  year: number,
  rows: { month: number; amount: number; units: number }[],
) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase.from('wholesale_budgets').upsert(
    rows.map((r) => ({
      client_id: clientId,
      year,
      month: r.month,
      amount: r.amount,
      units: r.units,
    })),
    { onConflict: 'client_id,year,month' },
  );
  if (error) throw error;
  revalidatePath('/wholesale/budgets');
  revalidatePath(`/wholesale/budgets/${clientId}`);
  revalidatePath('/wholesale');
}

type GoalStatus = 'pending' | 'in_progress' | 'done' | 'dropped';

export async function createWholesaleGoal(input: {
  rep_id: string;
  year: number;
  month: number;
  title: string;
  description?: string;
  target_value?: number | null;
}) {
  const { supabase, me } = await ensureCoordinator();
  const { error } = await supabase.from('wholesale_goals').insert({
    rep_id: input.rep_id,
    year: input.year,
    month: input.month,
    title: input.title,
    description: input.description || null,
    target_value: input.target_value ?? null,
    created_by: me.id,
  });
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${input.rep_id}`);
}

/** El avance lo reporta quien ejecuta: coordinación o el propio comercial. */
export async function updateGoalProgress(
  goalId: string,
  repId: string,
  patch: { progress_percent: number; status: GoalStatus; progress_note?: string },
) {
  const { supabase } = await ensureMember();
  const { error } = await supabase
    .from('wholesale_goals')
    .update({
      progress_percent: patch.progress_percent,
      status: patch.status,
      progress_note: patch.progress_note ?? null,
    })
    .eq('id', goalId);
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
}

export async function createWholesaleProject(input: {
  rep_id: string;
  client_id?: string | null;
  title: string;
  kind: 'evento' | 'campana' | 'capacitacion' | 'otro';
  description?: string;
  starts_on?: string | null;
  ends_on?: string | null;
  budget_amount?: number | null;
}) {
  const { supabase, me } = await ensureMember();
  if (me.role === 'rep' && input.rep_id !== me.repId) {
    throw new Error('Solo puedes crear proyectos de tu zona');
  }
  const { error } = await supabase.from('wholesale_projects').insert({
    rep_id: input.rep_id,
    client_id: input.client_id || null,
    title: input.title,
    kind: input.kind,
    description: input.description || null,
    starts_on: input.starts_on || null,
    ends_on: input.ends_on || null,
    budget_amount: input.budget_amount ?? null,
    created_by: me.id,
  });
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${input.rep_id}`);
}

export async function updateProjectProgress(
  projectId: string,
  repId: string,
  patch: { progress_percent: number; status: GoalStatus; progress_note?: string },
) {
  const { supabase } = await ensureMember();
  const { error } = await supabase
    .from('wholesale_projects')
    .update({
      progress_percent: patch.progress_percent,
      status: patch.status,
      progress_note: patch.progress_note ?? null,
    })
    .eq('id', projectId);
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
}

/** Los tipos viven en wholesale_activity_types, así que aquí es texto libre
 *  validado por la llave foránea. */
export type ActivityKind = string;
export type ActivityStatus = 'planned' | 'done' | 'cancelled';

export async function createActivity(input: {
  rep_id: string;
  client_id?: string | null;
  kind: ActivityKind;
  scheduled_on: string;
  starts_at?: string | null;
  title: string;
  notes?: string;
}) {
  const { supabase, me } = await ensureMember();
  if (me.role === 'rep' && input.rep_id !== me.repId) {
    throw new Error('Solo puedes agendar en tu propia agenda');
  }
  const { error } = await supabase.from('wholesale_activities').insert({
    rep_id: input.rep_id,
    client_id: input.client_id || null,
    kind: input.kind,
    scheduled_on: input.scheduled_on,
    starts_at: input.starts_at || null,
    title: input.title,
    notes: input.notes || null,
    created_by: me.id,
  });
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${input.rep_id}`);
}

export async function setActivityStatus(activityId: string, repId: string, status: ActivityStatus) {
  const { supabase } = await ensureMember();
  const { error } = await supabase
    .from('wholesale_activities')
    .update({ status })
    .eq('id', activityId);
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
}

export async function deleteActivity(activityId: string, repId: string) {
  const { supabase } = await ensureMember();
  const { error } = await supabase
    .from('wholesale_activities')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', activityId);
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
}

export async function saveActivityTargets(
  repId: string,
  year: number,
  month: number,
  targets: { kind: ActivityKind; target: number }[],
) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase.from('wholesale_activity_targets').upsert(
    targets.map((t) => ({ rep_id: repId, year, month, kind: t.kind, target: t.target })),
    { onConflict: 'rep_id,year,month,kind' },
  );
  if (error) throw error;
  revalidatePath(`/wholesale/reps/${repId}`);
}

export async function createActivityType(input: {
  slug: string;
  label: string;
  icon?: string;
  sort_order?: number;
}) {
  const { supabase } = await ensureCoordinator();
  const slug = input.slug
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  if (!slug) throw new Error('Nombre inválido');
  const { error } = await supabase.from('wholesale_activity_types').insert({
    slug,
    label: input.label,
    icon: input.icon || '📌',
    sort_order: input.sort_order ?? 100,
  });
  if (error) throw error;
  revalidatePath('/wholesale', 'layout');
}

export async function setActivityTypeActive(slug: string, isActive: boolean) {
  const { supabase } = await ensureCoordinator();
  const { error } = await supabase
    .from('wholesale_activity_types')
    .update({ is_active: isActive })
    .eq('slug', slug);
  if (error) throw error;
  revalidatePath('/wholesale', 'layout');
}
