import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PrintButton } from '@/components/wholesale/PrintButton';
import { requireWholesaleMe, salesMetrics, cop } from '@/lib/wholesale';
import { monthStart, monthEnd } from '@/lib/activities';

export const dynamic = 'force-dynamic';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function Bar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="wsale-meter">
      <span style={{ width: `${width}%` }} />
    </div>
  );
}

export default async function ChannelReport({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const me = await requireWholesaleMe();
  if (!me.isCoordination) redirect('/wholesale');

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  const month = monthParam ? Number(monthParam) : null;
  const from = month ? monthStart(year, month) : `${year}-01-01`;
  const to = month ? monthEnd(year, month) : `${year}-12-31`;
  const supabase = await createSupabaseServerClient();

  const [{ data: reps }, { data: clients }, { data: sales }, { data: budgets }, { data: expenses }] =
    await Promise.all([
      supabase.from('wholesale_reps').select('id, name, zone').is('deleted_at', null).order('name'),
      supabase.from('wholesale_clients').select('id, name, rep_id').is('deleted_at', null),
      supabase.from('wholesale_sales')
        .select('rep_id, client_id, units, binaural, rechargeable, net_amount')
        .is('deleted_at', null).gte('sold_on', from).lte('sold_on', to),
      supabase.from('wholesale_budgets').select('client_id, month, amount, units').eq('year', year),
      supabase.from('wholesale_expenses').select('rep_id, amount')
        .is('deleted_at', null).gte('spent_on', from).lte('spent_on', to),
    ]);

  const repList = reps ?? [];
  const repOfClient = new Map((clients ?? []).map((c) => [c.id, c.rep_id]));
  const clientsByRep = new Map<string, number>();
  for (const c of clients ?? []) {
    if (c.rep_id) clientsByRep.set(c.rep_id, (clientsByRep.get(c.rep_id) ?? 0) + 1);
  }

  const rows = repList.map((r) => {
    const rs = (sales ?? []).filter((s) => s.rep_id === r.id);
    const m = salesMetrics(rs);
    const budget = (budgets ?? [])
      .filter((b) => repOfClient.get(b.client_id) === r.id && (month === null || b.month === month))
      .reduce((acc, b) => ({
        amount: acc.amount + Number(b.amount ?? 0),
        units: acc.units + Number(b.units ?? 0),
      }), { amount: 0, units: 0 });
    const invested = (expenses ?? [])
      .filter((e) => e.rep_id === r.id)
      .reduce((a, e) => a + Number(e.amount ?? 0), 0);
    return {
      id: r.id, name: r.name, zone: r.zone,
      clients: clientsByRep.get(r.id) ?? 0,
      revenue: m.revenue, units: m.units, asp: m.asp,
      binaural: m.binauralRate, rechargeable: m.rechargeableRate,
      budget: budget.amount, budgetUnits: budget.units, invested,
    };
  });

  const total = rows.reduce((a, r) => ({
    revenue: a.revenue + r.revenue, units: a.units + r.units,
    budget: a.budget + r.budget, budgetUnits: a.budgetUnits + r.budgetUnits,
    invested: a.invested + r.invested, clients: a.clients + r.clients,
  }), { revenue: 0, units: 0, budget: 0, budgetUnits: 0, invested: 0, clients: 0 });

  const maxRevenue = Math.max(...rows.map((r) => r.revenue), 1);
  const period = month ? `${MONTHS[month - 1]} ${year}` : `Año ${year}`;

  return (
    <main className="wsale min-h-screen" style={{ background: '#fff' }}>
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="no-print flex items-center justify-between gap-4 mb-8">
          <Link href="/wholesale/reps" className="text-[var(--ink-soft)] text-sm hover:underline">← Volver</Link>
          <div className="flex gap-2 items-center">
            <Link
              href={`/wholesale/reps/reporte?year=${year}`}
              className={`h-9 px-3 leading-9 rounded-[2px] text-sm border transition ${
                month === null ? 'bg-[var(--ink)] text-white border-primary' : 'border-[var(--rule)] hover:border-[var(--rule-strong)]'
              }`}
            >
              Año
            </Link>
            {MONTHS.map((m, i) => (
              <Link
                key={m}
                href={`/wholesale/reps/reporte?year=${year}&month=${i + 1}`}
                className={`h-9 px-2 leading-9 rounded-[2px] text-xs border transition ${
                  month === i + 1 ? 'bg-[var(--ink)] text-white border-primary' : 'border-[var(--rule)] hover:border-[var(--rule-strong)]'
                }`}
              >
                {m.slice(0, 3)}
              </Link>
            ))}
            <PrintButton />
          </div>
        </div>

        <header className="flex items-start justify-between gap-6 border-b border-[var(--rule)] pb-6">
          <div>
            <Image src="/logo-aural.png" alt="Aural" width={4191} height={1432} className="w-[150px] h-auto" priority />
            <p className="text-xs uppercase tracking-widest text-[var(--ink-soft)] font-semibold mt-3">
              Wholesale · Reporte del canal
            </p>
            <h1 className="wsale-display text-[26px] mt-1">Todos los comerciales</h1>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{period}</p>
            <p className="text-[var(--ink-soft)]">
              Generado el {now.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-[var(--ink-soft)]">{total.clients} clientes · {repList.length} comerciales</p>
          </div>
        </header>

        <section className="mt-8 grid grid-cols-4 gap-4 print-page">
          {[
            ['Venta', cop(total.revenue), `${total.units} unidades`],
            ['Presupuesto', cop(total.budget), `${total.budgetUnits || '—'} unidades`],
            ['Cumplimiento', total.budget > 0 ? `${Math.round((total.revenue / total.budget) * 100)}%` : '—',
              total.budgetUnits > 0 ? `Unidades ${Math.round((total.units / total.budgetUnits) * 100)}%` : ''],
            ['Inversión', cop(total.invested),
              total.revenue > 0 ? `${((total.invested / total.revenue) * 100).toFixed(1)}% de la venta` : ''],
          ].map(([label, value, hint]) => (
            <div key={label} className="border border-[var(--rule)] rounded-[3px] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-soft)]">{label}</p>
              <p className="wsale-figure text-[19px] mt-1">{value}</p>
              {hint && <p className="text-xs text-[var(--ink-soft)] mt-0.5">{hint}</p>}
            </div>
          ))}
        </section>

        <section className="mt-8 print-page">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ink-soft)] border-b border-[var(--rule)] pb-2 mb-4">
            Por comercial
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--ink-soft)] text-xs uppercase tracking-wider">
                <th className="pb-2 font-semibold">Comercial</th>
                <th className="pb-2 font-semibold text-right">Ppto.</th>
                <th className="pb-2 font-semibold text-right">Venta</th>
                <th className="pb-2 font-semibold text-right">Cumpl.</th>
                <th className="pb-2 font-semibold text-right">Und</th>
                <th className="pb-2 font-semibold text-right">ASP</th>
                <th className="pb-2 font-semibold text-right">Inversión</th>
                <th className="pb-2 font-semibold w-20">Peso</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--rule)] print-row">
                  <td className="py-2">
                    {r.name}
                    {r.zone && <span className="text-[var(--ink-soft)] text-xs block">{r.zone}</span>}
                  </td>
                  <td className="py-2 text-right text-[var(--ink-soft)]">{r.budget > 0 ? cop(r.budget) : '—'}</td>
                  <td className="py-2 text-right font-medium">{cop(r.revenue)}</td>
                  <td className="py-2 text-right">
                    {r.budget > 0 ? `${Math.round((r.revenue / r.budget) * 100)}%` : '—'}
                  </td>
                  <td className="py-2 text-right text-[var(--ink-soft)]">{r.units || '—'}</td>
                  <td className="py-2 text-right text-[var(--ink-soft)]">{r.asp > 0 ? cop(r.asp) : '—'}</td>
                  <td className="py-2 text-right">
                    {r.invested > 0 ? cop(r.invested) : '—'}
                    {r.invested > 0 && r.revenue > 0 && (
                      <span className="text-[var(--ink-soft)] text-xs block">
                        {((r.invested / r.revenue) * 100).toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td className="py-2"><Bar value={r.revenue} max={maxRevenue} /></td>
                </tr>
              ))}
              <tr className="border-t-2 border-[var(--rule)] font-semibold">
                <td className="py-2">Total canal</td>
                <td className="py-2 text-right">{cop(total.budget)}</td>
                <td className="py-2 text-right">{cop(total.revenue)}</td>
                <td className="py-2 text-right">
                  {total.budget > 0 ? `${Math.round((total.revenue / total.budget) * 100)}%` : '—'}
                </td>
                <td className="py-2 text-right">{total.units}</td>
                <td className="py-2 text-right">
                  {total.units > 0 ? cop(total.revenue / total.units) : '—'}
                </td>
                <td className="py-2 text-right">{cop(total.invested)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mt-8 print-page">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ink-soft)] border-b border-[var(--rule)] pb-2 mb-4">
            Mix de producto
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--ink-soft)] text-xs uppercase tracking-wider">
                <th className="pb-2 font-semibold">Comercial</th>
                <th className="pb-2 font-semibold text-right">Binaurales</th>
                <th className="pb-2 font-semibold text-right">Recargables</th>
                <th className="pb-2 font-semibold text-right">Clientes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--rule)] print-row">
                  <td className="py-2">{r.name}</td>
                  <td className="py-2 text-right">{(r.binaural * 100).toFixed(0)}%</td>
                  <td className="py-2 text-right">{(r.rechargeable * 100).toFixed(0)}%</td>
                  <td className="py-2 text-right text-[var(--ink-soft)]">{r.clients}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="mt-10 pt-4 border-t border-[var(--rule)] text-xs text-[var(--ink-soft)] flex justify-between">
          <span>Aural · Wholesale</span>
          <span>Canal completo · {period}</span>
        </footer>
      </div>
    </main>
  );
}
