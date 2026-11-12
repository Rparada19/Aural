'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getWholesaleMe } from '@/lib/wholesale';
import { parseBudgetFile, type ZoneMonth } from '@/lib/budget-excel';

export interface ZonePreview {
  zone: string; known: boolean; replaces: boolean; months: number;
  prev_amount: number; amount: number; units: number; cost: number;
}

async function coordination() {
  const me = await getWholesaleMe();
  if (!me?.isCoordination) throw new Error('Solo coordinación carga presupuestos');
  return { me, supabase: await createSupabaseServerClient() };
}

/** Lee el Excel y resume por zona lo que va a cargar, sin guardar nada. */
export async function previewBudgetFile(form: FormData) {
  const { supabase } = await coordination();
  const file = form.get('file');
  const year = Number(form.get('year'));
  if (!(file instanceof File) || file.size === 0) throw new Error('Elige el archivo');
  if (!/\.xlsx$/i.test(file.name)) throw new Error('El archivo debe ser Excel (.xlsx). Si es .xls o .csv, ábrelo y guárdalo como .xlsx');

  let parsed;
  try { parsed = await parseBudgetFile(await file.arrayBuffer()); }
  catch (e) { throw new Error(e instanceof Error ? e.message : 'No pude leer el archivo'); }
  if (!parsed.rows.length) throw new Error('No encontré filas con zona y mes');

  const [{ data: clients }, { data: existing }] = await Promise.all([
    supabase.from('wholesale_clients').select('zone').is('deleted_at', null),
    supabase.from('wholesale_zone_budgets').select('zone').eq('year', year),
  ]);
  const known = new Set((clients ?? []).map((c) => (c.zone ?? '').trim().toLowerCase()).filter(Boolean));
  const had = new Set((existing ?? []).map((e) => e.zone.toLowerCase()));

  const byZone = new Map<string, ZonePreview>();
  for (const r of parsed.rows) {
    const k = r.zone.toLowerCase();
    const z = byZone.get(k) ?? { zone: r.zone, known: known.has(k) || k === 'sin zona', replaces: had.has(k), months: 0, prev_amount: 0, amount: 0, units: 0, cost: 0 };
    z.months += 1;
    z.prev_amount += r.prev_amount; z.amount += r.amount; z.units += r.units; z.cost += r.cost;
    byZone.set(k, z);
  }
  return {
    year, rows: parsed.rows, skipped: parsed.skipped,
    zones: [...byZone.values()].sort((a, b) => b.amount - a.amount),
  };
}

export async function importBudgets(year: number, rows: ZoneMonth[]) {
  const { me, supabase } = await coordination();
  if (!rows.length) throw new Error('No hay nada para cargar');
  const { error } = await supabase.from('wholesale_zone_budgets').upsert(
    rows.map((r) => ({ ...r, year, updated_by: me.id, updated_at: new Date().toISOString() })),
    { onConflict: 'zone,year,month' },
  );
  if (error) throw error;
  revalidatePath('/wholesale/budgets');
  revalidatePath('/wholesale');
  return new Set(rows.map((r) => r.zone.toLowerCase())).size;
}
