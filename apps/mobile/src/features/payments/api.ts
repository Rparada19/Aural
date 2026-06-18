import { supabase } from '../../lib/supabase';

export interface PaymentRow {
  id: string;
  amount: number;
  paid_at: string;
  channel: string;
  transaction_ref: string | null;
  notes: string | null;
  attachment_url: string | null;
  receipt_signed_url: string | null;
}

export async function listMyPayments(): Promise<PaymentRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, paid_at, channel, transaction_ref, notes, attachment_url')
    .eq('professional_id', user.id)
    .order('paid_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];

  // Generar URLs firmadas para los comprobantes
  const enriched: PaymentRow[] = await Promise.all(
    rows.map(async (r) => {
      let signed: string | null = null;
      if (r.attachment_url) {
        const { data: s } = await supabase.storage
          .from('payment-receipts')
          .createSignedUrl(r.attachment_url, 60 * 60);
        signed = s?.signedUrl ?? null;
      }
      return {
        id: r.id,
        amount: Number(r.amount),
        paid_at: r.paid_at,
        channel: r.channel,
        transaction_ref: r.transaction_ref,
        notes: r.notes,
        attachment_url: r.attachment_url,
        receipt_signed_url: signed,
      };
    }),
  );
  return enriched;
}
