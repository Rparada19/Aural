import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { MetricCard, EmptyState, Meter } from '@/components/wholesale/MetricCard';
import { requireWholesaleMe, salesMetrics, cop, pct } from '@/lib/wholesale';
import { LoanLight } from '@/components/wholesale/Loans';
import { daysLeft, type Loan } from '@/lib/loans';

export const dynamic = 'force-dynamic';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default async function WholesaleDashboard() {
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: clients }, { data: sales }, { data: budgets }, { data: loans }, { data: reps }] = await Promise.all([
    supabase
      .from('wholesale_clients')
      .select('id, name, city, zone, rep_id')
      .is('deleted_at', null)
      .eq('is_active', true),
    supabase
      .from('wholesale_sales')
      .select('client_id, sold_on, units, binaural, rechargeable, net_amount')
      .is('deleted_at', null),
    supabase
      .from('wholesale_budgets')
      .select('month, amount, units')
      .eq('year', now.getFullYear()),
    supabase
      .from('wholesale_loans')
      .select('id, client_id, rep_id, loaned_on, due_on, units, serials, patient_name, status')
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('due_on'),
    supabase.from('wholesale_reps').select('id, name').is('deleted_at', null),
  ]);

  const clientList = clients ?? [];
  const allSales = sales ?? [];
  const saleList = allSales.filter((s) => s.sold_on >= yearStart);
  const monthSales = saleList.filter((s) => s.sold_on >= monthStart);
  const month = salesMetrics(monthSales);
  const year = salesMetrics(saleList);

  const budgetList = budgets ?? [];
  const monthBudget = budgetList
    .filter((b) => b.month === now.getMonth() + 1)
    .reduce((a, b) => a + Number(b.amount ?? 0), 0);
  const yearBudget = budgetList.reduce((a, b) => a + Number(b.amount ?? 0), 0);
  const monthRatio = monthBudget > 0 ? month.revenue / monthBudget : null;

  // Ventas por mes del año en curso, para la barra de tendencia
  const byMonth = new Array(12).fill(0);
  for (const s of saleList) {
    const m = Number(s.sold_on.slice(5, 7)) - 1;
    byMonth[m] += Number(s.net_amount ?? 0);
  }
  const peak = Math.max(...byMonth, 1);

  // Top clientes del año
  const nameById = new Map(clientList.map((c) => [c.id, c.name]));
  const revenueByClient = new Map<string, number>();
  for (const s of saleList) {
    revenueByClient.set(s.client_id, (revenueByClient.get(s.client_id) ?? 0) + Number(s.net_amount ?? 0));
  }
  const top = [...revenueByClient.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Equipos prestados que hay que recuperar
  const openLoans = ((loans ?? []) as Loan[]).sort((a, b) => a.due_on.localeCompare(b.due_on));
  const overdueLoans = openLoans.filter((l) => daysLeft(l.due_on) < 0);
  const repNameById = new Map((reps ?? []).map((r) => [r.id, r.name]));
  const clientNameById = new Map(clientList.map((c) => [c.id, c.name]));

  // Seguimiento: quién no ha comprado en el mes en curso
  const boughtThisMonth = new Set(monthSales.map((s) => s.client_id));
  const lastSaleByClient = new Map<string, string>();
  const historyByClient = new Map<string, { total: number; count: number }>();
  for (const s of allSales) {
    const prev = lastSaleByClient.get(s.client_id);
    if (!prev || s.sold_on > prev) lastSaleByClient.set(s.client_id, s.sold_on);
    const h = historyByClient.get(s.client_id) ?? { total: 0, count: 0 };
    historyByClient.set(s.client_id, {
      total: h.total + Number(s.net_amount ?? 0),
      count: h.count + 1,
    });
  }

  const daysSince = (iso: string) =>
    Math.floor((Date.now() - Date.parse(`${iso}T00:00:00Z`)) / 86_400_000);

  const pending = clientList
    .filter((c) => !boughtThisMonth.has(c.id))
    .map((c) => {
      const last = lastSaleByClient.get(c.id) ?? null;
      const hist = historyByClient.get(c.id);
      return {
        ...c,
        last,
        days: last ? daysSince(last) : null,
        lifetime: hist?.total ?? 0,
      };
    })
    // Primero los que más pesan: quien más compra es quien más duele perder
    .sort((a, b) => b.lifetime - a.lifetime);

  const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline={`${MONTHS_FULL[now.getMonth()]} ${now.getFullYear()}`}
        title={me.isCoordination ? 'Resumen del canal' : `Tu zona, ${me.full_name.split(' ')[0]}`}
        subtitle={`${clientList.length} cliente${clientList.length === 1 ? '' : 's'} activo${clientList.length === 1 ? '' : 's'} · ${openLoans.length} equipo${openLoans.length === 1 ? '' : 's'} prestado${openLoans.length === 1 ? '' : 's'}`}
        actions={
          <Link href="/wholesale/sales/new" className="wsale-btn">Registrar venta</Link>
        }
      />

      {clientList.length === 0 ? (
        <EmptyState
          title="Todavía no hay clientes en el canal"
          description="Empieza cargando los centros auditivos y asignando cada uno a su comercial de zona. Las cifras aparecen solas apenas registres la primera venta."
          action={<Link href="/wholesale/clients/new" className="wsale-btn">Cargar el primer cliente</Link>}
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Venta del mes"
              value={cop(month.revenue)}
              hint={
                monthRatio === null
                  ? `${month.units} unidad${month.units === 1 ? '' : 'es'}`
                  : `${Math.round(monthRatio * 100)}% del presupuesto · ${month.units} und`
              }
              tone={monthRatio === null ? 'neutral' : monthRatio >= 1 ? 'success' : 'warning'}
            />
            <MetricCard label="ASP" value={month.asp > 0 ? cop(month.asp) : '—'} hint="Precio promedio por unidad" />
            <MetricCard
              label="Binauralidad"
              value={month.count > 0 ? pct(month.binauralRate) : '—'}
              hint={month.count > 0 ? `${pct(1 - month.binauralRate)} unilateral` : 'Sin ventas aún'}
              tone={month.binauralRate >= 0.5 ? 'success' : 'warning'}
            />
            <MetricCard
              label="Recargabilidad"
              value={month.count > 0 ? pct(month.rechargeableRate) : '—'}
              hint={month.count > 0 ? `${pct(1 - month.rechargeableRate)} batería` : 'Sin ventas aún'}
              tone={month.rechargeableRate >= 0.5 ? 'success' : 'warning'}
            />
          </section>

          {/* Tendencia del año: columnas finas, el mes en curso en cobre */}
          <section className="wsale-panel mt-8 p-6">
            <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-[var(--rule)]">
              <h2 className="wsale-display text-[17px]">Año en curso</h2>
              <p className="text-[12px] text-[var(--ink-soft)]">
                <span className="wsale-figure text-[15px]">{cop(year.revenue)}</span> acumulado
                {yearBudget > 0 && ` · ${Math.round((year.revenue / yearBudget) * 100)}% del presupuesto anual`}
              </p>
            </div>
            {/* Las barras miden en % de una altura fija: si la columna no
                la define, el porcentaje no tiene contra qué calcularse. */}
            <div className="mt-6">
              <div className="flex items-end gap-2 h-32">
                {byMonth.map((amount, i) => (
                  <div key={i} className="flex-1 h-full flex items-end group relative">
                    <div
                      className="w-full transition-all"
                      style={{
                        height: `${Math.max((amount / peak) * 100, 1.5)}%`,
                        background: i === now.getMonth() ? 'var(--accent)' : 'var(--ink)',
                        opacity: i === now.getMonth() ? 1 : i > now.getMonth() ? 0.1 : 0.4,
                      }}
                      title={`${MONTHS[i]}: ${cop(amount)}`}
                    />
                    {amount > 0 && (
                      <span className="wsale-mono absolute -top-4 left-0 right-0 text-center text-[9px] text-[var(--ink-faint)] opacity-0 group-hover:opacity-100 transition">
                        {Math.round(amount / 1_000_000)}M
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                {MONTHS.map((m, i) => (
                  <span
                    key={m}
                    className={`flex-1 text-center text-[10px] ${
                      i === now.getMonth()
                        ? 'text-[var(--accent)] font-medium'
                        : 'text-[var(--ink-faint)]'
                    }`}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2 mt-8 items-start">
            {openLoans.length > 0 && (
              <section className="wsale-panel p-6">
                <div className="flex items-baseline justify-between gap-4 pb-3 border-b border-[var(--rule)]">
                  <div>
                    <h2 className="wsale-display text-[17px]">Audífonos prestados</h2>
                    <p className="text-[11px] text-[var(--ink-faint)] mt-1">
                      {openLoans.length} en la calle
                      {overdueLoans.length > 0 && ` · ${overdueLoans.length} fuera de plazo`}
                    </p>
                  </div>
                  {overdueLoans.length > 0 && (
                    <span className="wsale-figure text-[24px] wsale-bad">{overdueLoans.length}</span>
                  )}
                </div>
                <ul>
                  {openLoans.map((l) => (
                    <li key={l.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--rule)] last:border-0">
                      <div className="flex-1 min-w-0">
                        <Link href={`/wholesale/clients/${l.client_id}`} className="text-[13px] hover:text-[var(--accent)] transition">
                          {clientNameById.get(l.client_id) ?? 'Cliente'}
                        </Link>
                        <p className="wsale-mono text-[10px] text-[var(--ink-faint)] mt-0.5 truncate">
                          {l.serials.join(' · ')}
                        </p>
                      </div>
                      <span className="text-[11px] text-[var(--ink-faint)] text-right whitespace-nowrap">
                        {l.rep_id ? repNameById.get(l.rep_id) : '—'}
                      </span>
                      <LoanLight dueOn={l.due_on} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {pending.length > 0 && (
              <section className="wsale-panel p-6">
                <div className="flex items-baseline justify-between gap-4 pb-3 border-b border-[var(--rule)]">
                  <div>
                    <h2 className="wsale-display text-[17px]">Sin compra en {MONTHS_FULL[now.getMonth()]}</h2>
                    <p className="text-[11px] text-[var(--ink-faint)] mt-1">
                      {pending.length} de {clientList.length}, por peso histórico
                    </p>
                  </div>
                  <span className="wsale-figure text-[24px] wsale-warn">{pending.length}</span>
                </div>
                <ul>
                  {pending.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-2.5 border-b border-[var(--rule)] last:border-0">
                      <div className="flex-1 min-w-0">
                        <Link href={`/wholesale/clients/${c.id}`} className="text-[13px] hover:text-[var(--accent)] transition">
                          {c.name}
                        </Link>
                        <p className="text-[11px] text-[var(--ink-faint)]">
                          {[c.city, c.zone].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className="text-[11px] text-right whitespace-nowrap">
                        {c.last === null ? (
                          <span className="text-[var(--ink-faint)]">Nunca compró</span>
                        ) : (
                          <span className={c.days! > 90 ? 'wsale-bad font-medium' : c.days! > 45 ? 'wsale-warn' : 'text-[var(--ink-faint)]'}>
                            {c.days} días
                          </span>
                        )}
                      </span>
                      <span className="wsale-figure text-[13px] w-28 text-right">
                        {c.lifetime > 0 ? cop(c.lifetime) : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {top.length > 0 && (
            <section className="wsale-panel mt-8 p-6">
              <h2 className="wsale-display text-[17px] pb-3 border-b border-[var(--rule)]">
                Clientes que más pesan
              </h2>
              <ul className="mt-1">
                {top.map(([clientId, amount], i) => (
                  <li key={clientId} className="flex items-center gap-4 py-3 border-b border-[var(--rule)] last:border-0">
                    <span className="wsale-mono text-[11px] text-[var(--ink-faint)] w-5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <Link href={`/wholesale/clients/${clientId}`} className="flex-1 truncate text-[13px] hover:text-[var(--accent)] transition">
                      {nameById.get(clientId) ?? 'Cliente'}
                    </Link>
                    <div className="w-48 hidden sm:block">
                      <Meter value={amount} max={top[0][1]} />
                    </div>
                    <span className="wsale-figure text-[14px] w-32 text-right">{cop(amount)}</span>
                    <span className="text-[11px] text-[var(--ink-faint)] w-12 text-right">
                      {Math.round((amount / year.revenue) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </WholesaleLayout>
  );
}
