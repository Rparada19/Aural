'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getWholesaleMe } from '@/lib/wholesale';
import { STAGE_PROB, today, type Stage } from '@/lib/crm';

async function member() {
  const me = await getWholesaleMe();
  if (!me) throw new Error('Sin acceso a wholesale');
  const supabase = await createSupabaseServerClient();
  return { supabase, me };
}

function refresh(id?: string) {
  revalidatePath('/wholesale/oportunidades');
  revalidatePath('/wholesale/oportunidades/red');
  revalidatePath('/wholesale');
  if (id) revalidatePath(`/wholesale/oportunidades/${id}`);
}

const blank = (v: unknown) => (v === '' || v === undefined ? null : v);

export interface OppInput {
  name: string;
  kind: string;
  rep_id?: string | null;
  client_id?: string | null;
  city?: string;
  zone?: string;
  source?: string;
  nit?: string;
  phone?: string;
  email?: string;
  est_units?: number | null;
  est_amount?: number | null;
  probability?: number | null;
  expected_close?: string | null;
  next_action?: string;
  next_action_on?: string | null;
  notes?: string;
}

function clean(input: Partial<OppInput>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) out[k] = blank(v);
  return out;
}

export async function createOpportunity(input: OppInput & { contact_name?: string; contact_role?: string }) {
  const { supabase, me } = await member();
  if (!input.name?.trim()) throw new Error('Escribe el nombre del centro o prospecto');
  const { contact_name, contact_role, ...rest } = input;
  const rep_id = me.role === 'rep' ? me.repId : blank(rest.rep_id);
  if (me.role === 'rep' && !rep_id) throw new Error('Tu usuario no está vinculado a una ficha de comercial');

  const { data, error } = await supabase
    .from('wholesale_opportunities')
    .insert({ ...clean(rest), name: rest.name.trim(), rep_id, created_by: me.id })
    .select('id')
    .single();
  if (error) throw error;

  if (contact_name?.trim()) {
    await supabase.from('wholesale_opp_contacts').insert({
      opportunity_id: data.id, name: contact_name.trim(), role: blank(contact_role), influence: 'decide',
    });
  }
  refresh(data.id);
  return data.id as string;
}

export async function updateOpportunity(id: string, input: Partial<OppInput>) {
  const { supabase, me } = await member();
  const patch = clean(input);
  if (me.role === 'rep') delete patch.rep_id;
  const { error } = await supabase.from('wholesale_opportunities').update(patch).eq('id', id);
  if (error) throw error;
  refresh(id);
}

export async function setStage(id: string, stage: Stage, extra?: { lost_reason?: string }) {
  const { supabase } = await member();
  const patch: Record<string, unknown> = { stage, probability: STAGE_PROB[stage] };
  if (stage === 'perdido') patch.lost_reason = extra?.lost_reason || 'Otro';
  if (stage === 'ganado') patch.won_on = today();
  if (stage !== 'ganado' && stage !== 'perdido') { patch.lost_reason = null; patch.won_on = null; }
  const { error } = await supabase.from('wholesale_opportunities').update(patch).eq('id', id);
  if (error) throw error;
  refresh(id);
}

/** Ganada: crea el centro como cliente con los datos del prospecto. */
export async function convertToClient(id: string) {
  const { supabase, me } = await member();
  if (!me.isCoordination) throw new Error('Coordinación crea el cliente; avísale a Margarita');
  const { data: o, error } = await supabase
    .from('wholesale_opportunities')
    .select('name, nit, phone, email, city, zone, rep_id, client_id, notes')
    .eq('id', id).single();
  if (error || !o) throw error ?? new Error('Oportunidad no encontrada');
  if (o.client_id) return o.client_id as string;

  const { data: decider } = await supabase
    .from('wholesale_opp_contacts')
    .select('name').eq('opportunity_id', id).eq('influence', 'decide').limit(1).maybeSingle();

  const { data: c, error: cErr } = await supabase.from('wholesale_clients').insert({
    name: o.name, nit: o.nit, phone: o.phone, email: o.email, city: o.city, zone: o.zone,
    rep_id: o.rep_id, contact_name: decider?.name ?? null, notes: o.notes,
  }).select('id').single();
  if (cErr) throw cErr;

  await supabase.from('wholesale_opportunities')
    .update({ client_id: c.id, stage: 'ganado', probability: 100, won_on: today() })
    .eq('id', id);
  refresh(id);
  revalidatePath('/wholesale/clients');
  return c.id as string;
}

export async function deleteOpportunity(id: string) {
  const { supabase, me } = await member();
  if (!me.isCoordination) throw new Error('Solo coordinación puede eliminar oportunidades');
  const { error } = await supabase.from('wholesale_opportunities')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
  refresh();
}

export async function saveContact(input: {
  id?: string; opportunity_id: string; name: string; role?: string;
  influence: string; sentiment: string; phone?: string; email?: string; notes?: string;
}) {
  const { supabase } = await member();
  if (!input.name.trim()) throw new Error('Falta el nombre');
  const { id, ...row } = input;
  const values = { ...row, name: row.name.trim(), role: blank(row.role), phone: blank(row.phone), email: blank(row.email), notes: blank(row.notes) };
  const { error } = id
    ? await supabase.from('wholesale_opp_contacts').update(values).eq('id', id)
    : await supabase.from('wholesale_opp_contacts').insert(values);
  if (error) throw error;
  refresh(input.opportunity_id);
}

export async function deleteContact(id: string, opportunityId: string) {
  const { supabase } = await member();
  const { error } = await supabase.from('wholesale_opp_contacts').delete().eq('id', id);
  if (error) throw error;
  refresh(opportunityId);
}

export async function logInteraction(input: {
  opportunity_id: string; kind: string; happened_on: string; summary: string; outcome: string;
  rep_ids: string[]; contact_ids: string[];
  next_action?: string; next_action_on?: string | null;
  sentiments?: Record<string, string>;
}) {
  const { supabase, me } = await member();
  if (!input.summary.trim()) throw new Error('Cuenta qué pasó');
  const rep_ids = input.rep_ids.length ? input.rep_ids : me.repId ? [me.repId] : [];

  const { error } = await supabase.from('wholesale_interactions').insert({
    opportunity_id: input.opportunity_id, kind: input.kind, happened_on: input.happened_on,
    summary: input.summary.trim(), outcome: input.outcome,
    rep_ids, contact_ids: input.contact_ids,
    author_id: me.id, author_name: me.full_name,
  });
  if (error) throw error;

  // Cada interacción deja agendado el siguiente paso
  const patch: Record<string, unknown> = {};
  if (input.next_action !== undefined) {
    patch.next_action = blank(input.next_action);
    patch.next_action_on = blank(input.next_action_on);
  }
  if (Object.keys(patch).length) {
    await supabase.from('wholesale_opportunities').update(patch).eq('id', input.opportunity_id);
  }
  for (const [cid, s] of Object.entries(input.sentiments ?? {})) {
    await supabase.from('wholesale_opp_contacts').update({ sentiment: s }).eq('id', cid);
  }
  refresh(input.opportunity_id);
}

export async function deleteInteraction(id: string, opportunityId: string) {
  const { supabase } = await member();
  const { error } = await supabase.from('wholesale_interactions').delete().eq('id', id);
  if (error) throw error;
  refresh(opportunityId);
}
