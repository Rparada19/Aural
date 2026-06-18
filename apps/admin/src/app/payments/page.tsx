import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';

export const dynamic = 'force-dynamic';

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default async function PaymentsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const [{ data: payments }, { data: commissions }, { data: allPayments }, { data: profiles }] = await Promise.all([
    supabase.from('payments')
      .select('id, professional_id, amount, paid_at, channel, transaction_ref, notes, attachment_url, created_at')
      .order('paid_at', { ascending: false })
      .limit(200),
    supabase.from('commissions').select('amount'),
    supabase.from('payments').select('amount'),
    supabase.from('profiles').select('id, full_name').eq('status', 'approved'),
  ]);

  const totalGenerated = (commissions ?? []).reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const totalPaid = (allPayments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const totalPending = Math.max(0, totalGenerated - totalPaid);
  const proMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <DashboardLayout userName={me.full_name}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Pagos</h1>
          <p className="text-secondary mt-1">Registra pagos a profesionales. La conciliación es automática (FIFO).</p>
        </div>
        <Link
          href="/payments/new"
          className="px-4 h-11 rounded-md bg-primary text-white font-semibold inline-flex items-center hover:bg-primary-soft"
        >
          + Registrar pago
        </Link>
      </div>

      <section className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Comisiones generadas" value={cop(totalGenerated)} />
        <StatCard label="Comisiones pagadas" value={cop(totalPaid)} accent="success" />
        <StatCard label="Saldo pendiente" value={cop(totalPending)} accent="warning" />
      </section>

      <div className="bg-white border border-border rounded-2xl overflow-hidden mt-8">
        <table className="w-full text-sm">
          <thead className="bg-surface text-secondary text-xs uppercase tracking-wider">
            <tr>
              <Th>Fecha</Th>
              <Th>Profesional</Th>
              <Th>Valor</Th>
              <Th>Canal</Th>
              <Th>Referencia</Th>
              <Th>Comprobante</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(payments ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-surface/60">
                <Td>{new Date(p.paid_at).toLocaleDateString('es-CO')}</Td>
                <Td className="font-medium text-primary">{proMap.get(p.professional_id) ?? '—'}</Td>
                <Td className="font-semibold">{cop(Number(p.amount))}</Td>
                <Td>{p.channel}</Td>
                <Td>{p.transaction_ref ?? '—'}</Td>
                <Td>
                  {p.attachment_url ? (
                    <ReceiptLink path={p.attachment_url} />
                  ) : '—'}
                </Td>
              </tr>
            ))}
            {(payments ?? []).length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-secondary">Sin pagos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-semibold px-6 py-3 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-4 text-foreground ${className}`}>{children}</td>;
}

async function ReceiptLink({ path }: { path: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage.from('payment-receipts').createSignedUrl(path, 60 * 60);
  if (!data?.signedUrl) return <span>—</span>;
  return <a href={data.signedUrl} target="_blank" rel="noopener" className="text-primary text-xs font-semibold hover:underline">Ver →</a>;
}
