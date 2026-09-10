import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PrintButton } from '@/components/wholesale/PrintButton';
import { requireWholesaleMe, salesMetrics, styleMix, cop, pct } from '@/lib/wholesale';
import { monthStart, monthEnd, type ActivityType } from '@/lib/activities';

export const dynamic = 'force-dynamic';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const STATUS_LABEL: Record<string, string> = {
  pending: 'Por empezar', in_progress: 'En curso', done: 'Cumplido', dropped: 'Descartado',
};

function Bar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
      <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 print-page">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-secondary border-b border-border pb-2 mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function RepReport({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { id } = await params;
  const { year: yearParam, month: monthParam } = await searchParams;
  const me = await requireWholesaleMe();
  if (me.role === 'rep' && me.repId !== id) notFound();

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  const month = monthParam ? Number(monthParam) : null;
  const from = month ? monthStart(year, month) : `${year}-01-01`;
  const to = month ? monthEnd(year, month) : `${year}-12-31`;
  const supabase = await createSupabaseServerClient();

  const [
    { data: rep }, { data: clients }, { data: sales }, { data: budgets },
    { data: goals }, { data: projects }, { data: activities }, { data: actTargets },
    { data: types }, { data: expenses }, { data: expenseCats }, { data: pStyles },
  ] = await Promise.all([
    supabase.from('wholesale_reps').select('id, name, zone, phone, email').eq('id', id).is('deleted_at', null).maybeSingle(),
    supabase.from('wholesale_clients').select('id, name, city').eq('rep_id', id).is('deleted_at', null).order('name'),
    supabase.from('wholesale_sales')
      .select('client_id, sold_on, units, binaural, rechargeable, style, discount_percent, list_price, net_amount')
      .eq('rep_id', id).is('deleted_at', null).gte('sold_on', from).lte('sold_on', to),
    supabase.from('wholesale_budgets').select('client_id, month, amount, units').eq('year', year),
    supabase.from('wholesale_goals')
      .select('month, title, target_value, progress_percent, status, progress_note')
      .eq('rep_id', id).eq('year', year).is('deleted_at', null).order('month'),
    supabase.from('wholesale_projects')
      .select('title, kind, client_id, starts_on, ends_on, budget_amount, progress_percent, status')
      .eq('rep_id', id).is('deleted_at', null),
    supabase.from('wholesale_activities').select('kind, status, scheduled_on')
      .eq('rep_id', id).is('deleted_at', null).gte('scheduled_on', from).lte('scheduled_on', to),
    supabase.from('wholesale_activity_targets').select('kind, target, month').eq('rep_id', id).eq('year', year),
    supabase.from('wholesale_activity_types').select('slug, label, icon, sort_order, is_active').order('sort_order'),
    supabase.from('wholesale_expenses').select('client_id, category, spent_on, amount, description')
      .eq('rep_id', id).is('deleted_at', null).gte('spent_on', from).lte('spent_on', to),
    supabase.from('wholesale_expense_categories').select('slug, label'),
    supabase.from('wholesale_product_styles').select('slug, label').order('sort_order'),
  ]);

  if (!rep) notFound();

  const clientList = clients ?? [];
  const clientIds = new Set(clientList.map((c) => c.id));
  const clientName = new Map(clientList.map((c) => [c.id, c.name]));
  const saleList = sales ?? [];
  const stats = salesMetrics(saleList);

  const myBudgets = (budgets ?? [])
    .filter((b) => clientIds.has(b.client_id) && (month === null || b.month === month));
  const budgetAmount = myBudgets.reduce((a, b) => a + Number(b.amount ?? 0), 0);
  const budgetUnits = myBudgets.reduce((a, b) => a + Number(b.units ?? 0), 0);

  const expenseList = expenses ?? [];
  const invested = expenseList.reduce((a, e) => a + Number(e.amount ?? 0), 0);
  const catLabel = new Map((expenseCats ?? []).map((c) => [c.slug, c.label]));

  // Por cliente: venta, unidades e inversión
  const perClient = clientList.map((c) => {
    const cs = saleList.filter((s) => s.client_id === c.id);
    const m = salesMetrics(cs);
    const inv = expenseList.filter((e) => e.client_id === c.id).reduce((a, e) => a + Number(e.amount ?? 0), 0);
    const bud = myBudgets.filter((b) => b.client_id === c.id).reduce((a, b) => a + Number(b.amount ?? 0), 0);
    return { id: c.id, name: c.name, city: c.city, revenue: m.revenue, units: m.units, budget: bud, invested: inv };
  }).sort((a, b) => b.revenue - a.revenue);

  const maxRevenue = Math.max(...perClient.map((c) => c.revenue), 1);

  const typeList = ((types ?? []) as ActivityType[]).filter((t) => t.is_active);
  const activityRows = typeList.map((t) => {
    const mine = (activities ?? []).filter((a) => a.kind === t.slug);
    const target = (actTargets ?? [])
      .filter((x) => x.kind === t.slug && (month === null || x.month === month))
      .reduce((a, x) => a + Number(x.target ?? 0), 0);
    return {
      label: t.label,
      done: mine.filter((a) => a.status === 'done').length,
      planned: mine.filter((a) => a.status === 'planned').length,
      target,
    };
  }).filter((r) => r.done + r.planned + r.target > 0);

  const goalList = (goals ?? []).filter((g) => month === null || g.month === month);

  const mix = styleMix(saleList);
  const period = month ? `${MONTHS[month - 1]} ${year}` : `Año ${year}`;
  const ratio = budgetAmount > 0 ? stats.revenue / budgetAmount : null;
  const investRatio = stats.revenue > 0 ? invested / stats.revenue : null;

  return (
    <main className="min-h-screen bg-white text-foreground">
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="no-print flex items-center justify-between gap-4 mb-8">
          <Link href={`/wholesale/reps/${id}`} className="text-secondary text-sm hover:underline">
            ← Volver
          </Link>
          <div className="flex gap-2 items-center">
            <Link
              href={`/wholesale/reps/${id}/reporte?year=${year}`}
              className={`h-9 px-3 leading-9 rounded-lg text-sm border transition ${
                month === null ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary'
              }`}
            >
              Año
            </Link>
            {MONTHS.map((m, i) => (
              <Link
                key={m}
                href={`/wholesale/reps/${id}/reporte?year=${year}&month=${i + 1}`}
                className={`h-9 px-2 leading-9 rounded-lg text-xs border transition ${
                  month === i + 1 ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary'
                }`}
              >
                {m.slice(0, 3)}
              </Link>
            ))}
            <PrintButton />
          </div>
        </div>

        {/* Encabezado del reporte */}
        <header className="flex items-start justify-between gap-6 border-b border-border pb-6">
          <div>
            <Image src="/logo.png" alt="Aural" width={150} height={46} className="h-auto" priority />
            <p className="text-xs uppercase tracking-widest text-secondary font-semibold mt-3">
              Wholesale · Reporte comercial
            </p>
            <h1 className="text-2xl font-semibold mt-1">{rep.name}</h1>
            <p className="text-secondary text-sm">
              {[rep.zone, rep.email, rep.phone].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{period}</p>
            <p className="text-secondary">
              Generado el {now.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-secondary">{clientList.length} clientes en cartera</p>
          </div>
        </header>

        {/* Resumen */}
        <Section title="Resumen del periodo">
          <div className="grid grid-cols-4 gap-4">
            {[
              ['Venta', cop(stats.revenue), `${stats.units} unidades`],
              ['Presupuesto', budgetAmount > 0 ? cop(budgetAmount) : '—', `${budgetUnits || '—'} unidades`],
              ['Cumplimiento', ratio === null ? '—' : `${Math.round(ratio * 100)}%`,
                budgetUnits > 0 ? `Unidades ${Math.round((stats.units / budgetUnits) * 100)}%` : ''],
              ['Inversión', cop(invested), investRatio === null ? '' : `${(investRatio * 100).toFixed(1)}% de la venta`],
            ].map(([label, value, hint]) => (
              <div key={label} className="border border-border rounded-xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary">{label}</p>
                <p className="text-lg font-semibold mt-1">{value}</p>
                {hint && <p className="text-xs text-secondary mt-0.5">{hint}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <p className="border border-border rounded-xl p-4">
              <span className="text-secondary text-xs block">ASP</span>
              <span className="font-semibold">{stats.asp > 0 ? cop(stats.asp) : '—'}</span>
            </p>
            <p className="border border-border rounded-xl p-4">
              <span className="text-secondary text-xs block">Adaptación</span>
              <span className="font-semibold">
                {stats.count > 0 ? `${pct(stats.binauralRate)} binaural` : '—'}
              </span>
              {stats.count > 0 && (
                <span className="text-secondary text-xs block">
                  {pct(1 - stats.binauralRate)} unilateral
                </span>
              )}
            </p>
            <p className="border border-border rounded-xl p-4">
              <span className="text-secondary text-xs block">Alimentación</span>
              <span className="font-semibold">
                {stats.count > 0 ? `${pct(stats.rechargeableRate)} recargable` : '—'}
              </span>
              {stats.count > 0 && (
                <span className="text-secondary text-xs block">
                  {pct(1 - stats.rechargeableRate)} batería
                </span>
              )}
            </p>
          </div>

          {Object.keys(mix).length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
              {(pStyles ?? []).map((st) => (
                <p key={st.slug} className="border border-border rounded-xl p-4">
                  <span className="text-secondary text-xs block">{st.label}</span>
                  <span className="font-semibold">{(mix[st.slug] ?? 0).toFixed(1)}%</span>
                </p>
              ))}
            </div>
          )}
        </Section>

        {/* Clientes */}
        <Section title="Desempeño por cliente">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-secondary text-xs uppercase tracking-wider">
                <th className="pb-2 font-semibold">Cliente</th>
                <th className="pb-2 font-semibold text-right">Presupuesto</th>
                <th className="pb-2 font-semibold text-right">Venta</th>
                <th className="pb-2 font-semibold text-right">Und</th>
                <th className="pb-2 font-semibold text-right">Inversión</th>
                <th className="pb-2 font-semibold w-24">Peso</th>
              </tr>
            </thead>
            <tbody>
              {perClient.map((c) => (
                <tr key={c.id} className="border-t border-border print-row">
                  <td className="py-2">
                    {c.name}
                    {c.city && <span className="text-secondary text-xs block">{c.city}</span>}
                  </td>
                  <td className="py-2 text-right text-secondary">{c.budget > 0 ? cop(c.budget) : '—'}</td>
                  <td className="py-2 text-right font-medium">{cop(c.revenue)}</td>
                  <td className="py-2 text-right text-secondary">{c.units || '—'}</td>
                  <td className="py-2 text-right">
                    {c.invested > 0 ? cop(c.invested) : '—'}
                    {c.invested > 0 && c.revenue > 0 && (
                      <span className="text-secondary text-xs block">
                        {((c.invested / c.revenue) * 100).toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td className="py-2"><Bar value={c.revenue} max={maxRevenue} /></td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-semibold">
                <td className="py-2">Total</td>
                <td className="py-2 text-right">{cop(budgetAmount)}</td>
                <td className="py-2 text-right">{cop(stats.revenue)}</td>
                <td className="py-2 text-right">{stats.units}</td>
                <td className="py-2 text-right">{cop(invested)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </Section>

        {/* Actividad */}
        {activityRows.length > 0 && (
          <Section title="Actividad">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-secondary text-xs uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Tipo</th>
                  <th className="pb-2 font-semibold text-right">Cumplidas</th>
                  <th className="pb-2 font-semibold text-right">Por hacer</th>
                  <th className="pb-2 font-semibold text-right">Meta</th>
                  <th className="pb-2 font-semibold w-24">Avance</th>
                </tr>
              </thead>
              <tbody>
                {activityRows.map((r) => (
                  <tr key={r.label} className="border-t border-border print-row">
                    <td className="py-2">{r.label}</td>
                    <td className="py-2 text-right font-medium">{r.done}</td>
                    <td className="py-2 text-right text-secondary">{r.planned || '—'}</td>
                    <td className="py-2 text-right text-secondary">{r.target || '—'}</td>
                    <td className="py-2">{r.target > 0 && <Bar value={r.done} max={r.target} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Objetivos */}
        {goalList.length > 0 && (
          <Section title="Objetivos">
            <div className="space-y-3">
              {goalList.map((g, i) => (
                <div key={i} className="border border-border rounded-xl p-3 print-row">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-sm">
                      {g.title}
                      <span className="text-secondary font-normal"> · {MONTHS[g.month - 1]}</span>
                    </p>
                    <span className="text-xs text-secondary whitespace-nowrap">
                      {STATUS_LABEL[g.status] ?? g.status} · {g.progress_percent}%
                    </span>
                  </div>
                  <div className="mt-2"><Bar value={g.progress_percent} max={100} /></div>
                  {g.progress_note && <p className="text-secondary text-xs mt-2 italic">“{g.progress_note}”</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Proyectos */}
        {(projects ?? []).length > 0 && (
          <Section title="Proyectos">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-secondary text-xs uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Proyecto</th>
                  <th className="pb-2 font-semibold">Cliente</th>
                  <th className="pb-2 font-semibold">Fechas</th>
                  <th className="pb-2 font-semibold text-right">Inversión</th>
                  <th className="pb-2 font-semibold text-right">Avance</th>
                </tr>
              </thead>
              <tbody>
                {(projects ?? []).map((p, i) => (
                  <tr key={i} className="border-t border-border print-row">
                    <td className="py-2">{p.title}</td>
                    <td className="py-2 text-secondary">{p.client_id ? clientName.get(p.client_id) ?? '—' : '—'}</td>
                    <td className="py-2 text-secondary text-xs">
                      {[p.starts_on, p.ends_on].filter(Boolean).join(' → ') || '—'}
                    </td>
                    <td className="py-2 text-right">{p.budget_amount ? cop(Number(p.budget_amount)) : '—'}</td>
                    <td className="py-2 text-right">{p.progress_percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {/* Gastos */}
        {expenseList.length > 0 && (
          <Section title="Detalle de gastos">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-secondary text-xs uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Fecha</th>
                  <th className="pb-2 font-semibold">Categoría</th>
                  <th className="pb-2 font-semibold">Detalle</th>
                  <th className="pb-2 font-semibold">Cliente</th>
                  <th className="pb-2 font-semibold text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {expenseList.map((e, i) => (
                  <tr key={i} className="border-t border-border print-row">
                    <td className="py-2 text-secondary">{e.spent_on}</td>
                    <td className="py-2">{catLabel.get(e.category) ?? e.category}</td>
                    <td className="py-2 text-secondary">{e.description ?? '—'}</td>
                    <td className="py-2 text-secondary">{e.client_id ? clientName.get(e.client_id) ?? '—' : '—'}</td>
                    <td className="py-2 text-right font-medium">{cop(Number(e.amount))}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-semibold">
                  <td className="py-2" colSpan={4}>Total invertido</td>
                  <td className="py-2 text-right">{cop(invested)}</td>
                </tr>
              </tbody>
            </table>
          </Section>
        )}

        <footer className="mt-10 pt-4 border-t border-border text-xs text-secondary flex justify-between">
          <span>Aural · Wholesale</span>
          <span>{rep.name} · {period}</span>
        </footer>
      </div>
    </main>
  );
}
