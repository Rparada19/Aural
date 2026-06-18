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
  return { supabase, adminId: user.id };
}

export async function uploadReceipt(formData: FormData): Promise<string> {
  const { supabase } = await ensureAdmin();
  const file = formData.get('file') as File | null;
  const professionalId = formData.get('professional_id') as string | null;
  if (!file || !professionalId) throw new Error('Falta archivo o profesional');
  const ext = (file.name.split('.').pop() ?? 'pdf').toLowerCase();
  const path = `${professionalId}/${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from('payment-receipts').upload(path, buf, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function registerPayment(input: {
  professional_id: string;
  amount: number;
  paid_at: string;
  channel: string;
  transaction_ref?: string | null;
  notes?: string | null;
  attachment_url?: string | null;
}) {
  const { supabase, adminId } = await ensureAdmin();

  // 1. Crear el pago
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .insert({
      professional_id: input.professional_id,
      amount: input.amount,
      paid_at: input.paid_at,
      channel: input.channel,
      transaction_ref: input.transaction_ref || null,
      notes: input.notes || null,
      attachment_url: input.attachment_url || null,
      created_by: adminId,
    })
    .select()
    .single();
  if (payErr || !payment) throw payErr ?? new Error('No se pudo crear el pago');

  // 2. Conciliación FIFO: marcar comisiones pendientes como pagadas
  const { data: pending } = await supabase
    .from('commissions')
    .select('id, amount')
    .eq('professional_id', input.professional_id)
    .eq('status', 'pending')
    .order('generated_at', { ascending: true });

  let remaining = input.amount;
  const idsToMark: string[] = [];
  for (const c of pending ?? []) {
    const amt = Number(c.amount);
    if (remaining + 0.01 < amt) break; // no alcanza para esta comisión completa
    idsToMark.push(c.id);
    remaining -= amt;
    if (remaining <= 0.01) break;
  }

  if (idsToMark.length > 0) {
    await supabase
      .from('commissions')
      .update({
        status: 'paid',
        paid_at: input.paid_at,
        payment_id: payment.id,
      })
      .in('id', idsToMark);
  }

  // 3. Audit log
  await supabase.from('audit_logs').insert({
    actor_id: adminId,
    action: 'register_payment',
    entity: 'payments',
    entity_id: payment.id,
    diff: { amount: input.amount, commissions_paid: idsToMark.length, leftover: remaining },
  });

  revalidatePath('/payments');
  revalidatePath(`/users/${input.professional_id}`);
  return { paymentId: payment.id, commissionsPaid: idsToMark.length, leftover: remaining };
}
