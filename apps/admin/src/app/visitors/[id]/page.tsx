import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { BudgetGrid } from '@/components/BudgetGrid';
import { BudgetChart } from '@/components/BudgetChart';
import { StatCard } from '@/components/StatCard';

export const dynamic = 'force-dynamic';

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default async function VisitorDetailPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const year = Number(sp.year) || new Date().getFullYear();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const { data: visitor } = await supabase.from('visitors').select('*').eq('id', id).single();
  if (!visitor) notFound();

  const [{ data: budgets }, { data: profiles }, { data: patients }] = await Promise.all([
    supabase.from('visitor_budgets').select('year, month, amount').eq('visitor_id', id).eq('year', year),
    supabase.from('profiles').select('id, full_name, status').eq('visitor_id', id),
    supabase.from('patients')
      .select('id, full_name, cedula, phone, professional_id, sale_closed, sale_closed_at, total_price, case_type, is_opportunity, funnel_status, created_at, updated_at')
      .is('deleted_at', null),
  ]);

  const proIds = new Set((profiles ?? []).map((p) => p.id));
  const proNameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const budgetMap = new Map((budgets ?? []).map((b) => [b.month, Number(b.amount)]));

  // Ventas por mes del año seleccionado
  const monthlySales = new Array(12).fill(0);
  for (const p of patients ?? []) {
    if (!p.sale_closed || !p.total_price || !p.sale_closed_at) continue;
    if (!proIds.has(p.professional_id)) continue;
    const d = new Date(p.sale_closed_at);
    if (d.getFullYear() !== year) continue;
    monthlySales[d.getMonth()] += Number(p.total_price);
  }

  // Oportunidades activas (cotizado, no cerrado, marcadas como oportunidad) de médicos de este visitador
  const opportunities = (patients ?? [])
    .filter((p) => proIds.has(p.professional_id) && p.is_opportunity && !p.sale_closed && p.total_price)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const chartData = Array.from({ length: 12 }, (_, i) => ({
    month: MONTHS_SHORT[i],
    budget: budgetMap.get(i + 1) ?? 0,
    sales: monthlySales[i],
  }));

  // Resumen anual
  const annualBudget = chartData.reduce((s, r) => s + r.budget, 0);
  const annualSales = chartData.reduce((s, r) => s + r.sales, 0);
  const missing = Math.max(0, annualBudget - annualSales);
  const annualAchievement = annualBudget > 0 ? Math.round((annualSales / annualBudget) * 100) : null;
  const monthsWithSales = chartData.filter((r) => r.sales > 0).length;
  const avgMonthlySales = monthsWithSales > 0 ? annualSales / monthsWithSales : 0;
  const bestMonth = chartData.reduce((best, r) => (r.sales > best.sales ? r : best), chartData[0] ?? { month: '—', sales: 0, budget: 0 });
  const opportunitiesAmount = opportunities.reduce((s, o) => s + Number(o.total_price ?? 0), 0);

  return (
    <DashboardLayout userName={me.full_name}>
      <Link href="/visitors" className="text-sm text-secondary hover:text-primary">← Visitadores</Link>
      <div className="flex items-start justify-between mt-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">{visitor.name}</h1>
          <p className="text-secondary mt-1">
            {[visitor.city, visitor.phone, visitor.email].filter(Boolean).join(' · ') || '—'}
          </p>
          <p className="text-xs text-secondary mt-2">
            {(profiles ?? []).length} médico(s) asignado(s) — {(profiles ?? []).map((p) => p.full_name).join(', ') || 'Ninguno'}
          </p>
        </div>
        <YearSelector year={year} visitorId={id} />
      </div>

      <section className="mt-8">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold mb-3">Resumen {year}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Presupuesto anual" value={cop(annualBudget)} />
          <StatCard label="Logrado" value={cop(annualSales)} accent="success" />
          <StatCard label="Faltante" value={cop(missing)} accent="warning" />
          <StatCard label="Cumplimiento" value={annualAchievement !== null ? `${annualAchievement}%` : '—'} accent={annualAchievement !== null && annualAchievement >= 100 ? 'success' : annualAchievement !== null && annualAchievement >= 70 ? 'warning' : 'danger'} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <StatCard label="Médicos asignados" value={(profiles ?? []).length} />
          <StatCard label="Oportunidades" value={opportunities.length} accent="warning" />
          <StatCard label="Valor oportunidades" value={cop(opportunitiesAmount)} accent="warning" />
          <StatCard label={`Mejor mes (${bestMonth.month})`} value={cop(bestMonth.sales)} />
        </div>
      </section>

      <section className="mt-8 bg-white border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-primary mb-4">Rendimiento {year}</h2>
        <BudgetChart data={chartData} />
      </section>

      <section className="mt-6 bg-white border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-primary mb-1">Oportunidades activas ({opportunities.length})</h2>
        <p className="text-secondary text-sm mb-4">Pacientes cotizados marcados como oportunidad. Seguimiento de cierre.</p>
        {opportunities.length === 0 ? (
          <p className="text-secondary text-sm">Sin oportunidades activas.</p>
        ) : (
          <ul className="divide-y divide-border">
            {opportunities.map((o) => (
              <li key={o.id} className="py-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-primary">{o.full_name}</p>
                  <p className="text-xs text-secondary">
                    CC {o.cedula} · {o.phone} · Dr. {proNameMap.get(o.professional_id) ?? '—'}
                  </p>
                </div>
                <span className="font-semibold text-warning">{cop(Number(o.total_price))}</span>
                <Link href={`/users/${o.professional_id}/patients/${o.id}`} className="text-xs text-primary font-semibold hover:underline">
                  Ficha →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 bg-white border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-primary mb-1">Presupuesto {year}</h2>
        <p className="text-secondary text-sm mb-4">Define un presupuesto distinto por cada mes. El sistema usa el del mes en curso para las métricas.</p>
        <BudgetGrid
          visitorId={id}
          year={year}
          budgets={Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            amount: budgetMap.get(i + 1) ?? 0,
            sales: monthlySales[i],
          }))}
        />
      </section>
    </DashboardLayout>
  );
}

function YearSelector({ year, visitorId }: { year: number; visitorId: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link href={`/visitors/${visitorId}?year=${year - 1}`} className="px-3 h-9 rounded-md border border-border text-sm">← {year - 1}</Link>
      <span className="px-3 h-9 inline-flex items-center font-semibold text-primary">{year}</span>
      <Link href={`/visitors/${visitorId}?year=${year + 1}`} className="px-3 h-9 rounded-md border border-border text-sm">{year + 1} →</Link>
    </div>
  );
}
