'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getWholesaleMe } from '@/lib/wholesale';
import { parseBudgetFile } from '@/lib/budget-excel';

export interface PreviewRow {
  client_id: string; name: string; zone: string | null;
  amounts: number[]; units: number[]; total: number; totalUnits: number; replaces: boolean;
}

async function coordination() {
  const me = await getWholesaleMe();
  if (!me?.isCoordination) throw new Error('Solo coordinación carga presupuestos');
  return createSupabaseServerClient();
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Lee el Excel y dice qué va a cargar, sin guardar nada todavía. */
export async function previewBudgetFile(form: FormData) {
  const supabase = await coordination();
  const file = form.get('file');
  const year = Number(form.get('year'));
  if (!(file instanceof File) || file.size === 0) throw new Error('Elige el archivo');
  if (!/\.xlsx$/i.test(file.name)) throw new Error('El archivo debe ser Excel (.xlsx). Si es .xls o .csv, ábrelo y guárdalo como .xlsx');

  let parsed;
  try { parsed = await parseBudgetFile(await file.arrayBuffer()); }
  catch (e) { throw new Error(e instanceof Error ? e.message : 'No pude leer el archivo'); }

  const [{ data: clients }, { data: existing }] = await Promise.all([
    supabase.from('wholesale_clients').select('id, name, nit, zone').is('deleted_at', null),
    supabase.from('wholesale_budgets').select('client_id').eq('year', year),
  ]);
  const byNit = new Map((clients ?? []).filter((c) => c.nit).map((c) => [String(c.nit).replace(/\D/g, ''), c]));
  const byName = new Map((clients ?? []).map((c) => [norm(c.name), c]));
  const had = new Set((existing ?? []).map((b) => b.client_id));

  const rows: PreviewRow[] = [];
  const unknown: { nit: string; name: string; total: number }[] = [];
  for (const r of parsed) {
    const total = r.amounts.reduce((a, b) => a + b, 0);
    const totalUnits = r.units.reduce((a, b) => a + b, 0);
    const c = byNit.get(r.nit.replace(/\D/g, '')) ?? byName.get(norm(r.name));
    if (!c) { if (total || totalUnits) unknown.push({ nit: r.nit, name: r.name, total }); continue; }
    if (!total && !totalUnits) continue;
    rows.push({ client_id: c.id, name: c.name, zone: c.zone, amounts: r.amounts, units: r.units, total, totalUnits, replaces: had.has(c.id) });
  }
  rows.sort((a, b) => b.total - a.total);
  return { year, rows, unknown };
}

export async function importBudgets(year: number, rows: PreviewRow[]) {
  const supabase = await coordination();
  if (!rows.length) throw new Error('No hay nada para cargar');
  const values = rows.flatMap((r) => r.amounts.map((amount, k) => ({
    client_id: r.client_id, year, month: k + 1, amount, units: r.units[k] ?? 0,
  })));
  const { error } = await supabase.from('wholesale_budgets').upsert(values, { onConflict: 'client_id,year,month' });
  if (error) throw error;
  revalidatePath('/wholesale/budgets');
  revalidatePath('/wholesale');
  return rows.length;
}
