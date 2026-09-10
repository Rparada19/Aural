import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { MetricCard, EmptyState } from '@/components/wholesale/MetricCard';
import { requireWholesaleMe, salesMetrics, cop, pct } from '@/lib/wholesale';
import { monthStart, monthEnd } from '@/lib/activities';

export const dynamic = 'force-dynamic';

const SIN_ZONA = 'Sin zona';
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default async function WholesaleSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; zone?: string }>;
}) {
  const { year: yearParam, month: monthParam, zone: zoneParam } = await searchParams;
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;
  const zone = zoneParam ?? null;
  const from = monthStart(year, month);
  const to = monthEnd(year, month);

  // La RLS ya limita al comercial a sus propias ventas: la misma consulta
  // le devuelve todo el canal al coordinador y solo lo suyo al comercial.
  const [{ data: sales }, { data: clients }, { data: budgets }, { data: styles }, { data: platforms }] =
    await Promise.all([
      supabase
        .from('wholesale_sales')
        .select('id, client_id, rep_id, sold_on, invoice_number, campaign_name, patient_name, units, binaural, rechargeable, style, platform, tech_level, list_price, discount_percent, net_amount')
        .is('deleted_at', null)
        .gte('sold_on', from)
        .lte('sold_on', to)
        .order('sold_on', { ascending: false }),
      supabase.from('wholesale_clients').select('id, name, zone, rep_id').is('deleted_at', null),
      supabase.from('wholesale_budgets').select('client_id, amount, units').eq('year', year).eq('month', month),
      supabase.from('wholesale_product_styles').select('slug, label'),
      supabase.from('wholesale_platforms').select('slug, label'),
    ]);

  const clientList = clients ?? [];
  const clientById = new Map(clientList.map((c) => [c.id, c]));
  const styleLabel = new Map((styles ?? []).map((s) => [s.slug, s.label]));
  const platformLabel = new Map((platforms ?? []).map((p) => [p.slug, p.label]));
  const zoneOf = (id: string) => clientById.get(id)?.zone?.trim() || SIN_ZONA;

  const allSales = sales ?? [];
  const saleList = zone ? allSales.filter((s) => zoneOf(s.client_id) === zone) : allSales;
  const stats = salesMetrics(saleList);

  const zones = [...new Set(allSales.map((s) => zoneOf(s.client_id)))].sort();

  const revenueByClient = new Map<string, { amount: number; units: number }>();
  for (const s of saleList) {
    const p = revenueByClient.get(s.client_id) ?? { amount: 0, units: 0 };
    revenueByClient.set(s.client_id, {
      amount: p.amount + Number(s.net_amount ?? 0),
      units: p.units + Number(s.units ?? 0),
    });
  }

  const budgetByClient = new Map<string, number>();
  for (const b of budgets ?? []) {
    budgetByClient.set(b.client_id, (budgetByClient.get(b.client_id) ?? 0) + Number(b.amount ?? 0));
  }

  const visibleClients = clientList.filter((c) => !zone || (c.zone?.trim() || SIN_ZONA) === zone);
  const withBudget = visibleClients
    .filter((c) => (budgetByClient.get(c.id) ?? 0) > 0)
    .map((c) => {
      const budget = budgetByClient.get(c.id)!;
      const actual = revenueByClient.get(c.id)?.amount ?? 0;
      return { id: c.id, name: c.name, budget, actual, ratio: actual / budget };
    })
    .sort((a, b) => b.ratio - a.ratio);

  const meeting = withBudget.filter((c) => c.ratio >= 1);
  const missing = withBudget.filter((c) => c.ratio < 1);

  const topClient = [...revenueByClient.entries()].sort((a, b) => b[1].amount - a[1].amount)[0];

  const href = (patch: { month?: number; year?: number; zone?: string | null }) => {
    const y = patch.year ?? year;
    const m = patch.month ?? month;
    const z = patch.zone === undefined ? zone : patch.zone;
    return `/wholesale/sales?year=${y}&month=${m}${z ? `&zone=${encodeURIComponent(z)}` : ''}`;
  };

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline={`Ventas · ${MONTHS[month - 1]} ${year}`}
        title={me.role === 'coordinator' ? 'Movimiento del canal' : 'Tus ventas del mes'}
        subtitle="Cada factura registrada alimenta el presupuesto mensual del cliente."
        actions={<Link href="/wholesale/sales/new" className="wsale-btn">Registrar venta</Link>}
      />

      <div className="flex flex-wrap items-center gap-1 mb-4">
        {MONTHS.map((label, i) => (
          <Link
            key={label}
            href={href({ month: i + 1 })}
            className="wsale-chip"
            data-on={month === i + 1}
          >
            {label}
          </Link>
        ))}
        <span className="w-4" />
        {[year - 1, year, year + 1].map((y) => (
          <Link
            key={y}
            href={href({ year: y })}
            className="wsale-chip"
            data-on={y === year}
          >
            {y}
          </Link>
        ))}
      </div>

      {me.role === 'coordinator' && zones.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href={href({ zone: null })}
            className="wsale-chip" data-on={zone === null}
          >
            Todas las zonas
          </Link>
          {zones.map((z) => (
            <Link
              key={z}
              href={href({ zone: z })}
              className="wsale-chip" data-on={zone === z}
            >
              {z}
            </Link>
          ))}
        </div>
      )}

      {saleList.length === 0 ? (
        <EmptyState
          emoji="💳"
          title={`Sin ventas en ${MONTHS[month - 1]}`}
          description="Registra la primera factura del mes y los indicadores aparecen solos."
          action={
            <Link
              href="/wholesale/sales/new"
              className="wsale-btn"
            >
              Registrar venta
            </Link>
          }
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <MetricCard label="Total" value={cop(stats.revenue)} hint={`${stats.count} facturas · ${stats.units} unidades`} />
            <MetricCard label="ASP" value={cop(stats.asp)} hint="Precio promedio por unidad" />
            <MetricCard
              label="Binauralidad"
              value={pct(stats.binauralRate)}
              hint={`${pct(1 - stats.binauralRate)} unilateral`}
              tone={stats.binauralRate >= 0.5 ? 'success' : 'warning'}
            />
            <MetricCard
              label="Recargabilidad"
              value={pct(stats.rechargeableRate)}
              hint={`${pct(1 - stats.rechargeableRate)} batería`}
              tone={stats.rechargeableRate >= 0.5 ? 'success' : 'warning'}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-3 mb-8">
            <div className="wsale-panel p-6">
              <h2 className="font-semibold">Cliente con más ventas</h2>
              {topClient ? (
                <>
                  <Link
                    href={`/wholesale/clients/${topClient[0]}`}
                    className="block text-lg font-semibold mt-3 hover:underline"
                  >
                    {clientById.get(topClient[0])?.name ?? 'Cliente'}
                  </Link>
                  <p className="text-[var(--ink-soft)] text-sm mt-1">
                    {cop(topClient[1].amount)} · {topClient[1].units} unidades
                  </p>
                  <p className="text-[var(--ink-soft)] text-xs mt-1">
                    {((topClient[1].amount / stats.revenue) * 100).toFixed(0)}% de la venta del mes
                  </p>
                </>
              ) : (
                <p className="text-[var(--ink-soft)] text-sm mt-3">Sin datos.</p>
              )}
            </div>

            <div className="wsale-panel p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">Cumpliendo presupuesto</h2>
                <span className="wsale-good font-semibold">{meeting.length}</span>
              </div>
              {meeting.length === 0 ? (
                <p className="text-[var(--ink-soft)] text-sm mt-3">Ninguno llegó a la meta del mes.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {meeting.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-sm">
                      <Link href={`/wholesale/clients/${c.id}`} className="flex-1 truncate hover:underline">
                        {c.name}
                      </Link>
                      <span className="wsale-good font-semibold">{Math.round(c.ratio * 100)}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="wsale-panel p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">Por debajo del presupuesto</h2>
                <span className="wsale-bad font-semibold">{missing.length}</span>
              </div>
              {missing.length === 0 ? (
                <p className="text-[var(--ink-soft)] text-sm mt-3">Todos van al día.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {missing.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-sm">
                      <Link href={`/wholesale/clients/${c.id}`} className="flex-1 truncate hover:underline">
                        {c.name}
                        <span className="text-[var(--ink-soft)] text-xs block">
                          Faltan {cop(c.budget - c.actual)}
                        </span>
                      </Link>
                      <span className={c.ratio >= 0.8 ? 'wsale-warn' : 'wsale-bad'}>
                        {Math.round(c.ratio * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <div className="wsale-panel overflow-x-auto">
            <table className="wsale-table min-w-[900px]">
              <thead>
                <tr className="text-left">
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Factura</th>
                  <th>Producto</th>
                  <th className="num">Lista</th>
                  <th className="num">Dcto.</th>
                  <th className="num">Neto</th>
                </tr>
              </thead>
              <tbody>
                {saleList.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap wsale-mono text-[11px]">{s.sold_on}</td>
                    <td >
                      <Link href={`/wholesale/clients/${s.client_id}`} className="hover:underline">
                        {clientById.get(s.client_id)?.name ?? 'Cliente'}
                      </Link>
                      <span className="text-[var(--ink-soft)] text-xs block">{zoneOf(s.client_id)}</span>
                    </td>
                    <td className="text-[var(--ink-soft)]">
                      {s.invoice_number ?? '—'}
                      {s.campaign_name && (
                        <span className="text-xs block text-[var(--accent)]">{s.campaign_name}</span>
                      )}
                    </td>
                    <td className="text-[var(--ink-soft)] text-[11px]">
                      {[
                        s.platform ? platformLabel.get(s.platform) : null,
                        s.tech_level,
                        s.style ? styleLabel.get(s.style) : null,
                      ].filter(Boolean).join(' ')}
                      <span className="block">
                        {s.units} und · {s.binaural ? 'binaural' : 'unilateral'} ·{' '}
                        {s.rechargeable ? 'recargable' : 'batería'}
                      </span>
                    </td>
                    <td className="num text-[var(--ink-soft)]">{cop(Number(s.list_price))}</td>
                    <td className="num text-[var(--ink-soft)]">{Number(s.discount_percent)}%</td>
                    <td className="num wsale-figure text-[13px]">{cop(Number(s.net_amount))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td  colSpan={6}>Total {MONTHS[month - 1]}</td>
                  <td className="num wsale-figure text-[14px]">{cop(stats.revenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </WholesaleLayout>
  );
}
