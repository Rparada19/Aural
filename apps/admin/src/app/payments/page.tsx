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

  const [{ data: commissions }, { data: allPayments }, { data: profiles }] = await Promise.all([
    supabase.from('commissions').select('professional_id, amount'),
    supabase.from('payments').select('professional_id, amount, paid_at'),
    supabase.from('profiles').select('id, full_name, email, status').eq('status', 'approved'),
  ]);

  const genByPro = new Map<string, number>();
  for (const c of commissions ?? []) {
    genByPro.set(c.professional_id, (genByPro.get(c.professional_id) ?? 0) + Number(c.amount ?? 0));
  }
  const paidByPro = new Map<string, number>();
  const lastPaidByPro = new Map<string, string>();
  for (const p of allPayments ?? []) {
    paidByPro.set(p.professional_id, (paidByPro.get(p.professional_id) ?? 0) + Number(p.amount ?? 0));
    const prev = lastPaidByPro.get(p.professional_id);
    if (!prev || new Date(p.paid_at).getTime() > new Date(prev).getTime()) {
      lastPaidByPro.set(p.professional_id, p.paid_at);
    }
  }

  const rows = (profiles ?? []).map((p) => {
    const generated = genByPro.get(p.id) ?? 0;
    const paid = paidByPro.get(p.id) ?? 0;
    const pending = Math.max(0, generated - paid);
    return {
      id: p.id,
      name: p.full_name,
      email: p.email,
      generated,
      paid,
      pending,
      lastPaid: lastPaidByPro.get(p.id) ?? null,
    };
  }).sort((a, b) => b.pending - a.pending);

  const totalGenerated = rows.reduce((s, r) => s + r.generated, 0);
  const totalPaid = rows.reduce((s, r) => s + r.paid, 0);
  const totalPending = rows.reduce((s, r) => s + r.pending, 0);

  return (
    <DashboardLayout userName={me.full_name}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Pagos</h1>
          <p className="text-secondary mt-1">Estado de comisiones por profesional. Conciliación FIFO automática.</p>
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
              <Th>Profesional</Th>
              <Th className="text-right">Generado</Th>
              <Th className="text-right">Pagado</Th>
              <Th className="text-right">Saldo</Th>
              <Th>Último pago</Th>
              <Th className="text-right pr-6">Historial</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface/60">
                <Td>
                  <Link href={`/payments/${r.id}`} className="font-medium text-primary hover:underline">{r.name}</Link>
                  <br /><span className="text-xs text-secondary">{r.email}</span>
                </Td>
                <Td className="text-right">{cop(r.generated)}</Td>
                <Td className="text-right text-success font-semibold">{cop(r.paid)}</Td>
                <Td className={`text-right font-semibold ${r.pending > 0 ? 'text-warning' : 'text-secondary'}`}>{cop(r.pending)}</Td>
                <Td className="text-xs text-secondary">{r.lastPaid ? new Date(r.lastPaid).toLocaleDateString('es-CO') : '—'}</Td>
                <Td className="text-right pr-6">
                  <Link href={`/payments/${r.id}`} className="text-primary text-xs font-semibold hover:underline">Abrir →</Link>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-secondary">Sin profesionales aprobados.</td></tr>
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
