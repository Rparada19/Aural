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
