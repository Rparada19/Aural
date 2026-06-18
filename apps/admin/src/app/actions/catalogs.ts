'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const ALLOWED = ['technologies', 'platforms', 'cities', 'locations', 'patient_origins', 'visitors', 'audiologists'] as const;
type Table = (typeof ALLOWED)[number];

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
  return supabase;
}

function assertTable(t: string): asserts t is Table {
  if (!ALLOWED.includes(t as Table)) throw new Error('Tabla no permitida');
}

export async function createCatalogItem(table: string, payload: Record<string, unknown>) {
  assertTable(table);
  const supabase = await ensureAdmin();
  const { error } = await supabase.from(table).insert(payload);
  if (error) throw error;
  revalidatePath('/catalogs');
}

export async function updateCatalogItem(table: string, id: string, payload: Record<string, unknown>) {
  assertTable(table);
  const supabase = await ensureAdmin();
  const { error } = await supabase.from(table).update(payload).eq('id', id);
  if (error) throw error;
  revalidatePath('/catalogs');
}

export async function toggleCatalogItem(table: string, id: string, is_active: boolean) {
  assertTable(table);
  const supabase = await ensureAdmin();
  const { error } = await supabase.from(table).update({ is_active }).eq('id', id);
  if (error) throw error;
  revalidatePath('/catalogs');
}
