'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getWholesaleMe } from '@/lib/wholesale';

async function member() {
  const me = await getWholesaleMe();
  if (!me) throw new Error('Sin acceso');
  return { me, supabase: await createSupabaseServerClient() };
}

function refresh() {
  revalidatePath('/wholesale', 'layout');
}

export async function addTask(input: { title: string; due_on?: string | null; owner_id?: string | null; remind_at?: string | null }) {
  const { me, supabase } = await member();
  if (!input.title.trim()) throw new Error('Escribe el pendiente');
  const owner = input.owner_id && me.isCoordination ? input.owner_id : me.id;
  const { error } = await supabase.from('wholesale_tasks').insert({
    owner_id: owner, title: input.title.trim(), due_on: input.due_on || null, remind_at: input.remind_at || null,
    created_by: me.id, created_by_name: me.full_name,
  });
  if (error) throw error;
  refresh();
}

export async function toggleTask(id: string, done: boolean) {
  const { supabase } = await member();
  const { error } = await supabase.from('wholesale_tasks').update({ done_at: done ? new Date().toISOString() : null }).eq('id', id);
  if (error) throw error;
  refresh();
}

export async function deleteTask(id: string) {
  const { supabase } = await member();
  const { error } = await supabase.from('wholesale_tasks').delete().eq('id', id);
  if (error) throw error;
  refresh();
}

export async function saveNotepad(body: string) {
  const { me, supabase } = await member();
  const { error } = await supabase.from('wholesale_notepads')
    .upsert({ owner_id: me.id, body, updated_at: new Date().toISOString() }, { onConflict: 'owner_id' });
  if (error) throw error;
}

export interface BellTask { id: string; title: string; due_on: string | null; remind_at: string | null; late: boolean }

/** Lo que muestra la campana: pendientes vencidos, de hoy y alarmas que ya sonaron
 *  o deben sonar. Las alarmas nuevas se devuelven en `ring` y quedan marcadas. */
export async function bellStatus(): Promise<{ tasks: BellTask[]; ring: BellTask[] }> {
  const me = await getWholesaleMe();
  if (!me) return { tasks: [], ring: [] };
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const today = new Date(now.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
  const { data } = await supabase.from('wholesale_tasks')
    .select('id, title, due_on, remind_at, reminded_at')
    .eq('owner_id', me.id).is('done_at', null)
    .or(`due_on.lte.${today},remind_at.lte.${now.toISOString()}`)
    .order('due_on', { ascending: true, nullsFirst: false }).limit(30);
  const rows = data ?? [];
  const ring = rows.filter((r) => r.remind_at && !r.reminded_at && r.remind_at <= now.toISOString());
  if (ring.length) {
    await supabase.from('wholesale_tasks').update({ reminded_at: now.toISOString() }).in('id', ring.map((r) => r.id));
  }
  const shape = (r: (typeof rows)[number]): BellTask => ({ id: r.id, title: r.title, due_on: r.due_on, remind_at: r.remind_at, late: !!r.due_on && r.due_on < today });
  return { tasks: rows.map(shape), ring: ring.map(shape) };
}
