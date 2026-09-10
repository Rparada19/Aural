import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { MetricCard, EmptyState } from '@/components/wholesale/MetricCard';
import { requireWholesaleMe, salesMetrics, cop, pct } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default async function WholesaleDashboard() {
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: clients }, { data: sales }, { data: budgets }] = await Promise.all([
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

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Wholesale</p>
        <h1 className="text-2xl font-semibold mt-1">
          {me.role === 'coordinator' ? 'Resumen del canal' : `Tu zona, ${me.full_name.split(' ')[0]}`}
        </h1>
        <p className="text-secondary text-sm mt-1">
          {MONTHS[now.getMonth()]} {now.getFullYear()} · {clientList.length} cliente
          {clientList.length === 1 ? '' : 's'} activo{clientList.length === 1 ? '' : 's'}
        </p>
      </header>

      {clientList.length === 0 ? (
        <EmptyState
          emoji="🗺️"
          title="Todavía no hay clientes en el canal"
          description="Empieza cargando los centros auditivos y asignando cada uno a su comercial de zona. Las métricas aparecen solas apenas registres la primera venta."
          action={
            <Link
              href="/wholesale/clients/new"
              className="inline-block h-11 leading-[44px] px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft transition"
            >
              Cargar el primer cliente
            </Link>
          }
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Ventas del mes"
              value={cop(month.revenue)}
              hint={
                monthRatio === null
                  ? `${month.units} unidad${month.units === 1 ? '' : 'es'}`
                  : `${Math.round(monthRatio * 100)}% del presupuesto`
              }
              tone={monthRatio === null ? 'neutral' : monthRatio >= 1 ? 'success' : 'warning'}
            />
            <MetricCard
              label="ASP"
              value={month.asp > 0 ? cop(month.asp) : '—'}
              hint="Precio promedio por unidad"
            />
            <MetricCard
              label="Binaurales"
              value={month.count > 0 ? pct(month.binauralRate) : '—'}
              hint="De las ventas del mes"
              tone={month.binauralRate >= 0.5 ? 'success' : 'warning'}
            />
            <MetricCard
              label="Recargables"
              value={month.count > 0 ? pct(month.rechargeableRate) : '—'}
              hint="De las ventas del mes"
              tone={month.rechargeableRate >= 0.5 ? 'success' : 'warning'}
            />
          </section>

          {pending.length > 0 && (
            <section className="mt-8 bg-white rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h2 className="font-semibold">Sin compra en {MONTHS[now.getMonth()]}</h2>
                  <p className="text-secondary text-xs mt-1">
                    {pending.length} de {clientList.length} clientes. Ordenados por lo que suelen pesar.
                  </p>
                </div>
                <p className="text-2xl font-semibold text-warning">{pending.length}</p>
              </div>

              <ul className="mt-4 divide-y divide-border">
                {pending.map((c) => (
                  <li key={c.id} className="flex items-center gap-4 py-2.5">
                    <Link href={`/wholesale/clients/${c.id}`} className="flex-1 min-w-0 hover:underline">
                      <span className="block truncate">{c.name}</span>
                      <span className="text-secondary text-xs">
                        {[c.city, c.zone].filter(Boolean).join(' · ')}
                      </span>
                    </Link>

                    <span className="text-xs text-right whitespace-nowrap">
                      {c.last === null ? (
                        <span className="text-secondary">Nunca ha comprado</span>
                      ) : (
                        <>
                          <span className={c.days! > 90 ? 'text-danger font-semibold' : c.days! > 45 ? 'text-warning' : 'text-secondary'}>
                            {c.days} días sin comprar
                          </span>
                          <span className="block text-secondary">Última: {c.last}</span>
                        </>
                      )}
                    </span>

                    <span className="w-32 text-right text-sm">
                      {c.lifetime > 0 ? cop(c.lifetime) : '—'}
                      <span className="block text-secondary text-xs">histórico</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8 bg-white rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Año en curso</h2>
              <p className="text-secondary text-sm">
                {cop(year.revenue)} acumulado
                {yearBudget > 0 && ` · ${Math.round((year.revenue / yearBudget) * 100)}% del presupuesto`}
              </p>
            </div>
            <div className="mt-6 flex items-end gap-2 h-40">
              {byMonth.map((amount, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      i === now.getMonth() ? 'bg-primary' : 'bg-primary/25'
                    }`}
                    style={{ height: `${Math.max((amount / peak) * 100, 2)}%` }}
                    title={`${MONTHS[i]}: ${cop(amount)}`}
                  />
                  <span className="text-[10px] text-secondary">{MONTHS[i]}</span>
                </div>
              ))}
            </div>
          </section>

          {top.length > 0 && (
            <section className="mt-8 bg-white rounded-2xl border border-border p-6 shadow-sm">
              <h2 className="font-semibold">Clientes que más pesan</h2>
              <ul className="mt-4 space-y-3">
                {top.map(([clientId, amount], i) => (
                  <li key={clientId} className="flex items-center gap-4">
                    <span className="w-6 text-secondary text-sm font-semibold">{i + 1}</span>
                    <Link
                      href={`/wholesale/clients/${clientId}`}
                      className="flex-1 truncate hover:underline"
                    >
                      {nameById.get(clientId) ?? 'Cliente'}
                    </Link>
                    <div className="w-40 h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(amount / top[0][1]) * 100}%` }}
                      />
                    </div>
                    <span className="w-32 text-right text-sm font-semibold">{cop(amount)}</span>
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
