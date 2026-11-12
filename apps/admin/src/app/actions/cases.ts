'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getWholesaleMe } from '@/lib/wholesale';
import { CASE_KIND } from '@/lib/cases';

async function member() {
  const me = await getWholesaleMe();
  if (!me || !me.modules.includes('casos')) throw new Error('No tienes acceso a casos');
  const supabase = await createSupabaseServerClient();
  return { supabase, me };
}

function refresh(id?: string, clientId?: string) {
  revalidatePath('/wholesale/casos');
  if (id) revalidatePath(`/wholesale/casos/${id}`);
  if (clientId) revalidatePath(`/wholesale/clients/${clientId}`);
}

const addDays = (n: number) => new Date(Date.now() - 5 * 3_600_000 + n * 86_400_000).toISOString().slice(0, 10);

export async function createCase(input: {
  client_id: string; kind: string; priority: string; subject: string;
  description?: string; patient_name?: string; serial?: string; assign_to_me?: boolean;
}) {
  const { supabase, me } = await member();
  if (!input.client_id) throw new Error('Elige el cliente');
  if (!input.subject.trim()) throw new Error('Escribe en una línea qué necesita el cliente');
  const days = CASE_KIND[input.kind]?.days ?? 5;
  const { data, error } = await supabase.from('wholesale_cases').insert({
    client_id: input.client_id, kind: input.kind, priority: input.priority,
    subject: input.subject.trim(), description: input.description?.trim() || null,
    patient_name: input.patient_name?.trim() || null, serial: input.serial?.trim() || null,
    due_on: addDays(input.priority === 'alta' ? Math.min(days, 2) : days),
    assigned_to: input.assign_to_me === false ? null : me.id,
    assigned_name: input.assign_to_me === false ? null : me.full_name,
    created_by: me.id, created_by_name: me.full_name,
  }).select('id').single();
  if (error) throw error;
  refresh(data.id, input.client_id);
  return data.id as string;
}

export async function updateCase(id: string, patch: {
  status?: string; priority?: string; due_on?: string | null;
  assigned_to?: string | null; assigned_name?: string | null;
}, note?: string) {
  const { supabase, me } = await member();
  const values: Record<string, unknown> = { ...patch };
  if (patch.status === 'resuelto' || patch.status === 'cerrado') values.resolved_at = new Date().toISOString();
  else if (patch.status) values.resolved_at = null;
  const { data, error } = await supabase.from('wholesale_cases').update(values).eq('id', id).select('client_id').single();
  if (error) throw error;
  if (note?.trim()) {
    await supabase.from('wholesale_case_notes').insert({ case_id: id, author_id: me.id, author_name: me.full_name, body: note.trim() });
  }
  refresh(id, data.client_id);
}

export async function takeCase(id: string) {
  const { me } = await member();
  await updateCase(id, { assigned_to: me.id, assigned_name: me.full_name, status: 'en_proceso' }, `${me.full_name} tomó el caso.`);
}

export async function addCaseNote(id: string, body: string) {
  const { supabase, me } = await member();
  if (!body.trim()) throw new Error('Escribe la nota');
  const { error } = await supabase.from('wholesale_case_notes').insert({ case_id: id, author_id: me.id, author_name: me.full_name, body: body.trim() });
  if (error) throw error;
  await supabase.from('wholesale_cases').update({ updated_at: new Date().toISOString() }).eq('id', id);
  refresh(id);
}
