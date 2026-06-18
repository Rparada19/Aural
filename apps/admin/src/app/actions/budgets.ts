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
  return supabase;
}

export async function upsertBudget(visitorId: string, year: number, month: number, amount: number) {
  const supabase = await ensureAdmin();
  const { error } = await supabase
    .from('visitor_budgets')
    .upsert({ visitor_id: visitorId, year, month, amount }, { onConflict: 'visitor_id,year,month' });
  if (error) throw error;
  revalidatePath(`/visitors/${visitorId}`);
  revalidatePath('/visitors');
}
