import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';

export const dynamic = 'force-dynamic';

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default async function ProfessionalPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const { data: prof } = await supabase
    .from('profiles').select('id, full_name, email, phone, city, profession').eq('id', id).single();
  if (!prof) notFound();

  const [{ data: commissions }, { data: payments }] = await Promise.all([
    supabase
      .from('commissions')
      .select('id, amount, status, generated_at, paid_at, patient_id')
      .eq('professional_id', id)
      .order('generated_at', { ascending: false }),
    supabase
      .from('payments')
      .select('id, amount, paid_at, channel, transaction_ref, notes, attachment_url')
      .eq('professional_id', id)
      .order('paid_at', { ascending: false }),
  ]);

  const patientIds = Array.from(new Set((commissions ?? []).map((c) => c.patient_id).filter(Boolean) as string[]));
  const { data: patients } = patientIds.length
    ? await supabase.from('patients').select('id, full_name').in('id', patientIds)
    : { data: [] as { id: string; full_name: string }[] };
  const pMap = new Map((patients ?? []).map((p) => [p.id, p.full_name]));

  const generated = (commissions ?? []).reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const pending = Math.max(0, generated - paid);

  return (
    <DashboardLayout userName={me.full_name}>
      <Link href="/payments" className="text-sm text-secondary hover:text-primary">← Pagos</Link>
      <h1 className="text-3xl font-bold text-primary mt-4">{prof.full_name}</h1>
      <p className="text-secondary mt-1">
        {[prof.profession, prof.city, prof.email, prof.phone].filter(Boolean).join(' · ')}
      </p>

      <section className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Comisiones generadas" value={cop(generated)} />
        <StatCard label="Comisiones pagadas" value={cop(paid)} accent="success" />
        <StatCard label="Saldo pendiente" value={cop(pending)} accent="warning" />
      </section>

      <section className="mt-8 bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-primary">Pagos registrados</h2>
          <Link href={`/payments/new?professional=${id}`} className="text-primary text-xs font-semibold hover:underline">+ Registrar pago</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface text-secondary text-xs uppercase tracking-wider">
            <tr>
              <Th>Fecha</Th>
              <Th>Valor</Th>
              <Th>Canal</Th>
              <Th>Referencia</Th>
              <Th>Notas</Th>
              <Th>Comprobante</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(payments ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-surface/60">
                <Td>{new Date(p.paid_at).toLocaleDateString('es-CO')}</Td>
                <Td className="font-semibold">{cop(Number(p.amount))}</Td>
                <Td>{p.channel}</Td>
                <Td>{p.transaction_ref ?? '—'}</Td>
                <Td className="text-xs text-secondary max-w-xs truncate">{p.notes ?? '—'}</Td>
                <Td>
                  {p.attachment_url ? <ReceiptLink path={p.attachment_url} /> : '—'}
                </Td>
              </tr>
            ))}
            {(payments ?? []).length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-secondary">Sin pagos registrados.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-8 bg-white border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-primary">Comisiones generadas</h2>
          <p className="text-xs text-secondary mt-1">Una comisión por venta cerrada. Conciliación FIFO con los pagos.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface text-secondary text-xs uppercase tracking-wider">
            <tr>
              <Th>Generada</Th>
              <Th>Paciente</Th>
              <Th>Valor</Th>
              <Th>Estado</Th>
              <Th>Pagada</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(commissions ?? []).map((c) => (
              <tr key={c.id} className="hover:bg-surface/60">
                <Td>{new Date(c.generated_at).toLocaleDateString('es-CO')}</Td>
                <Td className="text-primary">{c.patient_id ? pMap.get(c.patient_id) ?? '—' : '—'}</Td>
                <Td className="font-semibold">{cop(Number(c.amount))}</Td>
                <Td>
                  <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                    c.status === 'paid' ? 'bg-success/15 text-success' :
                    c.status === 'partial' ? 'bg-warning/15 text-warning' :
                    'bg-border text-secondary'
                  }`}>{c.status}</span>
                </Td>
                <Td className="text-xs text-secondary">{c.paid_at ? new Date(c.paid_at).toLocaleDateString('es-CO') : '—'}</Td>
              </tr>
            ))}
            {(commissions ?? []).length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-secondary">Sin comisiones generadas.</td></tr>
            )}
          </tbody>
        </table>
      </section>
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
