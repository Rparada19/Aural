import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { ProStatusControls } from '@/components/ProStatusControls';
import { VisitorAssign } from '@/components/VisitorAssign';
import { MonthlyDiagnosis } from '@/components/charts/MonthlyDiagnosis';
import { ROLES, OTORRINO_SPECIALTIES, FUNNEL_STATUS_LABEL, type PatientFunnelStatus } from '@aural/shared';

export const dynamic = 'force-dynamic';

export default async function ProfessionalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const { data: pro } = await supabase
    .from('profiles')
    .select('*, visitor:visitor_id (id, name, phone, email, city)')
    .eq('id', id)
    .single();
  if (!pro) notFound();

  const { data: visitorsList } = await supabase
    .from('visitors').select('id, name, phone, email, city')
    .eq('is_active', true).order('name');

  const [{ data: patients }, { data: commissions }, { data: payments }] = await Promise.all([
    supabase
      .from('patients')
      .select('id, full_name, cedula, phone, funnel_status, sale_closed, total_price, case_type, created_at')
      .eq('professional_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('commissions').select('amount').eq('professional_id', id),
    supabase.from('payments').select('amount, paid_at, channel').eq('professional_id', id).order('paid_at', { ascending: false }),
  ]);

  const list = patients ?? [];
  const caseHearingLoss = list.filter((p) => p.case_type === 'sale_candidate').length;
  const caseNormal = list.filter((p) => p.case_type === 'normal_hearing').length;
  const caseSudden = list.filter((p) => p.case_type === 'sudden_hearing_loss').length;

  const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const now = new Date();
  const monthly: { month: string; total: number; hearing_loss: number; normal: number; sudden: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const rowsM = list.filter((p) => {
      const cd = new Date(p.created_at);
      return cd.getFullYear() === y && cd.getMonth() === m;
    });
    monthly.push({
      month: MONTHS_SHORT[m] ?? '',
      total: rowsM.length,
      hearing_loss: rowsM.filter((p) => p.case_type === 'sale_candidate').length,
      normal: rowsM.filter((p) => p.case_type === 'normal_hearing').length,
      sudden: rowsM.filter((p) => p.case_type === 'sudden_hearing_loss').length,
    });
  }

  const salesClosed = list.filter((p) => p.sale_closed).length;
  const amountSold = list.filter((p) => p.sale_closed).reduce((s, p) => s + Number(p.total_price ?? 0), 0);
  const amountQuoted = list.filter((p) => !p.sale_closed && p.total_price).reduce((s, p) => s + Number(p.total_price ?? 0), 0);
  const commissionGenerated = (commissions ?? []).reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const commissionPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const commissionPending = Math.max(0, commissionGenerated - commissionPaid);

  const roleLabel = ROLES.find((r) => r.slug === pro.role)?.label ?? pro.role;
  const specialtyLabel = pro.specialty
    ? OTORRINO_SPECIALTIES.find((s) => s.slug === pro.specialty)?.label
    : null;

  const cop = (n: number) =>
    n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  return (
    <DashboardLayout userName={me.full_name}>
      <Link href="/users" className="text-sm text-secondary hover:text-primary">← Profesionales</Link>

      <div className="mt-4 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">{pro.full_name}</h1>
          <p className="text-secondary mt-1">
            {roleLabel}{specialtyLabel ? ` · ${specialtyLabel}` : ''} · {pro.city}
          </p>
          <p className="text-secondary text-sm mt-1">
            CC {pro.cedula} · {pro.email} · {pro.phone}
          </p>
        </div>
        <ProStatusControls userId={pro.id} status={pro.status} rejectionReason={pro.rejection_reason} />
      </div>

      <section className="mt-8 bg-white border border-border rounded-2xl p-6">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold mb-3">Visitador médico asignado</p>
        <VisitorAssign userId={pro.id} currentVisitor={pro.visitor ?? null} visitors={visitorsList ?? []} />
      </section>

      <section className="mt-8">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold mb-3">Diagnósticos</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Pérdida auditiva" value={caseHearingLoss} accent="warning" />
          <StatCard label="Audición normal" value={caseNormal} accent="success" />
          <StatCard label="Hipoacusia súbita" value={caseSudden} accent="danger" />
        </div>
      </section>

      <section className="mt-8 bg-white border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary">Pacientes referidos por mes</h2>
          <span className="text-xs text-secondary">Últimos 12 meses · Total: {list.length}</span>
        </div>
        <MonthlyDiagnosis data={monthly} />
      </section>

      <section className="mt-8">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold mb-3">Operación</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Pacientes" value={list.length} />
          <StatCard label="Ventas cerradas" value={salesClosed} accent="success" />
          <StatCard label="Valor vendido" value={cop(amountSold)} />
          <StatCard label="Valor cotizado" value={cop(amountQuoted)} accent="warning" />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-widest text-secondary font-semibold">Comisiones</p>
          <Link
            href={`/payments/new?professional=${id}`}
            className="text-xs font-semibold text-primary hover:underline"
          >
            + Registrar pago
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Generadas" value={cop(commissionGenerated)} />
          <StatCard label="Pagadas" value={cop(commissionPaid)} accent="success" />
          <StatCard label="Pendientes" value={cop(commissionPending)} accent="warning" />
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">Pacientes ({list.length})</h2>
          <Link
            href={`/users/${id}/patients/new`}
            className="px-4 h-10 rounded-md bg-primary text-white text-sm font-semibold inline-flex items-center hover:bg-primary-soft"
          >
            + Nuevo paciente
          </Link>
        </div>
        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-secondary text-xs uppercase tracking-wider">
              <tr>
                <Th>Nombre</Th>
                <Th>Cédula</Th>
                <Th>Teléfono</Th>
                <Th>Estado</Th>
                <Th>Valor total</Th>
                <Th>Creado</Th>
                <Th className="text-right pr-6">Ficha</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((p) => (
                <tr key={p.id} className="hover:bg-surface/60">
                  <Td className="font-medium text-primary">{p.full_name}</Td>
                  <Td>{p.cedula}</Td>
                  <Td>{p.phone}</Td>
                  <Td>{FUNNEL_STATUS_LABEL[p.funnel_status as PatientFunnelStatus]}</Td>
                  <Td>{p.total_price ? cop(Number(p.total_price)) : '—'}</Td>
                  <Td>{new Date(p.created_at).toLocaleDateString('es-CO')}</Td>
                  <Td className="text-right pr-6">
                    <Link href={`/users/${id}/patients/${p.id}`} className="text-primary text-xs font-semibold hover:underline">
                      Abrir →
                    </Link>
                  </Td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-secondary">Aún no tiene pacientes.</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
