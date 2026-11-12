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

export async function addTask(input: { title: string; due_on?: string | null; owner_id?: string | null }) {
  const { me, supabase } = await member();
  if (!input.title.trim()) throw new Error('Escribe el pendiente');
  const owner = input.owner_id && me.isCoordination ? input.owner_id : me.id;
  const { error } = await supabase.from('wholesale_tasks').insert({
    owner_id: owner, title: input.title.trim(), due_on: input.due_on || null,
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
