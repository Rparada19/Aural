import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { PendingUsersTable } from '@/components/PendingUsersTable';
import { MonthlyDiagnosis } from '@/components/charts/MonthlyDiagnosis';
import { LeadManagedButton } from '@/components/LeadManagedButton';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('is_admin, full_name')
    .eq('id', user.id)
    .single();
  if (!me?.is_admin) redirect('/login');

  const [
    { count: totalUsers },
    { count: pendingUsers },
    { count: approvedUsers },
    { count: totalPatients },
    patientsAgg,
    commissionsAgg,
    paymentsAgg,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('patients').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('patients').select('sale_closed, total_price, case_type, created_at, discount_percent, binaural').is('deleted_at', null),
    supabase.from('commissions').select('amount'),
    supabase.from('payments').select('amount'),
  ]);

  const patients = patientsAgg.data ?? [];
  const commissions = commissionsAgg.data ?? [];
  const allPayments = paymentsAgg.data ?? [];

  const salesClosed = patients.filter((p) => p.sale_closed).length;
  const amountSold = patients
    .filter((p) => p.sale_closed)
    .reduce((s, p) => s + Number(p.total_price ?? 0), 0);
  const amountQuoted = patients
    .filter((p) => !p.sale_closed && p.total_price)
    .reduce((s, p) => s + Number(p.total_price ?? 0), 0);

  const commissionGenerated = commissions.reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const commissionPaid = allPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const commissionPending = Math.max(0, commissionGenerated - commissionPaid);

  const quotedPatients = patients.filter((p: any) => p.total_price && Number(p.total_price) > 0);
  const quotedCount = quotedPatients.length;
  const quotedDevicesCount = quotedPatients.reduce((s: number, p: any) => s + (p.binaural ? 2 : 1), 0);

  const closedSales = patients.filter((p: any) => p.sale_closed);
  const salesFull = closedSales.filter((p: any) => !p.discount_percent || Number(p.discount_percent) === 0).length;
  const salesDiscount = closedSales.filter((p: any) => Number(p.discount_percent) > 0).length;
  const amountFull = closedSales.filter((p: any) => !p.discount_percent || Number(p.discount_percent) === 0).reduce((s: number, p: any) => s + Number(p.total_price ?? 0), 0);
  const amountDiscount = closedSales.filter((p: any) => Number(p.discount_percent) > 0).reduce((s: number, p: any) => s + Number(p.total_price ?? 0), 0);

  const casePending = patients.filter((p: any) => p.case_type === 'pending_evaluation').length;
  const caseHearingLoss = patients.filter((p: any) => p.case_type === 'sale_candidate').length;
  const caseNormal = patients.filter((p: any) => p.case_type === 'normal_hearing').length;
  const caseSudden = patients.filter((p: any) => p.case_type === 'sudden_hearing_loss').length;

  const MONTHS_SHORT_G = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const nowG = new Date();
  const monthlyGlobal: { month: string; total: number; hearing_loss: number; normal: number; sudden: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(nowG.getFullYear(), nowG.getMonth() - i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const rowsM = patients.filter((p: any) => {
      const cd = new Date(p.created_at);
      return cd.getFullYear() === y && cd.getMonth() === m;
    });
    monthlyGlobal.push({
      month: MONTHS_SHORT_G[m] ?? '',
      total: rowsM.length,
      hearing_loss: rowsM.filter((p: any) => p.case_type === 'sale_candidate').length,
      normal: rowsM.filter((p: any) => p.case_type === 'normal_hearing').length,
      sudden: rowsM.filter((p: any) => p.case_type === 'sudden_hearing_loss').length,
    });
  }

  const { data: pendingList } = await supabase
    .from('profiles')
    .select('id, full_name, email, cedula, city, profession, role, specialty, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: leadsToContact } = await supabase
    .from('patients')
    .select('id, full_name, phone, priority, city_text, created_at, professional_id')
    .is('deleted_at', null)
    .not('priority', 'is', null)
    .eq('funnel_status', 'registered')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20);
  const proIdsLead = Array.from(new Set((leadsToContact ?? []).map((l) => l.professional_id)));
  const { data: leadDocs } = proIdsLead.length
    ? await supabase.from('profiles').select('id, full_name').in('id', proIdsLead)
    : { data: [] as { id: string; full_name: string }[] };
  const leadDocMap = new Map((leadDocs ?? []).map((d) => [d.id, d.full_name]));

  const cop = (n: number) =>
    n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  return (
    <DashboardLayout userName={me.full_name}>
      <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
      <p className="text-secondary mt-1">Resumen general de la comunidad y operación.</p>

      <section className="mt-8">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold mb-3">Profesionales</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total usuarios" value={totalUsers ?? 0} />
          <StatCard label="Pendientes" value={pendingUsers ?? 0} accent="warning" />
          <StatCard label="Aprobados" value={approvedUsers ?? 0} accent="success" />
        </div>
      </section>

      <section className="mt-10">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold mb-3">Operación</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Pacientes" value={totalPatients ?? 0} />
          <StatCard label="Cotizados" value={quotedCount} accent="warning" />
          <StatCard label="Audífonos cotizados" value={quotedDevicesCount} accent="warning" />
          <StatCard label="Ventas cerradas" value={salesClosed} accent="success" />
          <StatCard label="Valor vendido" value={cop(amountSold)} accent="success" />
          <StatCard label="Valor cotizado" value={cop(amountQuoted)} accent="warning" />
        </div>
      </section>

      <section className="mt-10">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold mb-3">Diagnósticos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Por evaluar" value={casePending} accent="default" />
          <StatCard label="Pérdida auditiva" value={caseHearingLoss} accent="warning" />
          <StatCard label="Audición normal" value={caseNormal} accent="success" />
          <StatCard label="Hipoacusia súbita" value={caseSudden} accent="danger" />
        </div>
      </section>

      <section className="mt-10 bg-white border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary">Pacientes remitidos por mes</h2>
          <span className="text-xs text-secondary">Últimos 12 meses · Total: {totalPatients ?? 0}</span>
        </div>
        <MonthlyDiagnosis data={monthlyGlobal} />
      </section>

      <section className="mt-10">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold mb-3">Ventas full vs descuento</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Ventas full" value={salesFull} accent="success" />
          <StatCard label="Valor full" value={cop(amountFull)} accent="success" />
          <StatCard label="Ventas con descuento" value={salesDiscount} accent="warning" />
          <StatCard label="Valor con descuento" value={cop(amountDiscount)} accent="warning" />
        </div>
      </section>

      <section className="mt-10">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold mb-3">Comisiones</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Generadas" value={cop(commissionGenerated)} />
          <StatCard label="Pagadas" value={cop(commissionPaid)} accent="success" />
          <StatCard label="Pendientes" value={cop(commissionPending)} accent="warning" />
        </div>
      </section>

      {(leadsToContact ?? []).length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-primary">Oportunidades por contactar</h2>
            <span className="text-xs text-secondary">Referidas por los médicos desde la app</span>
          </div>
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface text-secondary text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-6 py-3">Prioridad</th>
                  <th className="text-left px-6 py-3">Paciente</th>
                  <th className="text-left px-6 py-3">Teléfono</th>
                  <th className="text-left px-6 py-3">Ciudad</th>
                  <th className="text-left px-6 py-3">Referido por</th>
                  <th className="text-left px-6 py-3">Fecha</th>
                  <th className="text-right px-6 py-3 pr-6">Ficha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(leadsToContact ?? []).map((l) => (
                  <tr key={l.id} className="hover:bg-surface/60">
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${l.priority === 'alta' ? 'bg-danger text-white' : 'bg-warning/20 text-warning'}`}>
                        {l.priority === 'alta' ? 'URGENTE' : 'MEDIA'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-primary">{l.full_name}</td>
                    <td className="px-6 py-4">{l.phone}</td>
                    <td className="px-6 py-4">{l.city_text ?? '—'}</td>
                    <td className="px-6 py-4 text-xs">{leadDocMap.get(l.professional_id) ?? '—'}</td>
                    <td className="px-6 py-4 text-xs">{new Date(l.created_at).toLocaleDateString('es-CO')}</td>
                    <td className="px-6 py-4 text-right pr-6">
                      <div className="inline-flex items-center gap-2">
                        <LeadManagedButton patientId={l.id} />
                        <a href={`/users/${l.professional_id}/patients/${l.id}`} className="text-primary text-xs font-semibold hover:underline">Abrir →</a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">Solicitudes pendientes</h2>
        </div>
        <PendingUsersTable users={pendingList ?? []} />
      </section>
    </DashboardLayout>
  );
}
