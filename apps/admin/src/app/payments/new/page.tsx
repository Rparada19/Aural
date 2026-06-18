import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NewPaymentForm } from '@/components/NewPaymentForm';

export const dynamic = 'force-dynamic';

interface Sp { professional?: string }

export default async function NewPaymentPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const { data: pros } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('status', 'approved')
    .order('full_name');

  // Calcular saldo pendiente por profesional
  const { data: pendingComs } = await supabase
    .from('commissions')
    .select('professional_id, amount')
    .eq('status', 'pending');

  const pendingByPro = new Map<string, number>();
  for (const c of pendingComs ?? []) {
    const cur = pendingByPro.get(c.professional_id) ?? 0;
    pendingByPro.set(c.professional_id, cur + Number(c.amount));
  }

  const proOptions = (pros ?? []).map((p) => ({
    id: p.id,
    label: p.full_name,
    pending: pendingByPro.get(p.id) ?? 0,
  }));

  return (
    <DashboardLayout userName={me.full_name}>
      <Link href="/payments" className="text-sm text-secondary hover:text-primary">← Pagos</Link>
      <h1 className="text-3xl font-bold text-primary mt-4">Registrar pago</h1>
      <p className="text-secondary mt-1">Al guardar, se descontará automáticamente del saldo pendiente del profesional.</p>

      <div className="bg-white border border-border rounded-2xl p-6 mt-6 max-w-2xl">
        <NewPaymentForm professionals={proOptions} preselected={sp.professional} />
      </div>
    </DashboardLayout>
  );
}
