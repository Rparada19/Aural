import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { EmptyState } from '@/components/wholesale/MetricCard';
import { NewRepForm } from '@/components/wholesale/NewRepForm';
import { RepCharts } from '@/components/wholesale/RepCharts';
import { requireWholesaleMe, cop } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

function Compliance({ actual, budget }: { actual: number; budget: number }) {
  if (budget <= 0) return <span className="text-secondary">—</span>;
  const ratio = actual / budget;
  const tone =
    ratio >= 1 ? 'text-success font-semibold'
    : ratio >= 0.8 ? 'text-warning'
    : 'text-danger';
  return <span className={tone}>{Math.round(ratio * 100)}%</span>;
}

export default async function WholesaleRepsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const me = await requireWholesaleMe();
  if (me.role !== 'coordinator') redirect('/wholesale');

  const year = Number(yearParam) || new Date().getFullYear();
  const supabase = await createSupabaseServerClient();

  const [{ data: reps }, { data: clients }, { data: sales }, { data: budgets }] = await Promise.all([
    supabase.from('wholesale_reps').select('id, name, zone, phone, email').is('deleted_at', null).order('name'),
    supabase.from('wholesale_clients').select('id, rep_id').is('deleted_at', null),
    supabase
      .from('wholesale_sales')
      .select('rep_id, sold_on, units, net_amount, binaural, rechargeable, discount_percent, list_price')
      .is('deleted_at', null)
      .gte('sold_on', `${year}-01-01`)
      .lte('sold_on', `${year}-12-31`),
    supabase.from('wholesale_budgets').select('client_id, month, amount, units').eq('year', year),
  ]);

  const repList = reps ?? [];
  const repByClient = new Map((clients ?? []).map((c) => [c.id, c.rep_id]));

  const clientsByRep = new Map<string, number>();
  for (const c of clients ?? []) {
    if (c.rep_id) clientsByRep.set(c.rep_id, (clientsByRep.get(c.rep_id) ?? 0) + 1);
  }

  const actualByRep = new Map<string, { amount: number; units: number }>();
  for (const s of sales ?? []) {
    if (!s.rep_id) continue;
    const prev = actualByRep.get(s.rep_id) ?? { amount: 0, units: 0 };
    actualByRep.set(s.rep_id, {
      amount: prev.amount + Number(s.net_amount ?? 0),
      units: prev.units + Number(s.units ?? 0),
    });
  }

  // El presupuesto se define por cliente; el del comercial es la suma de su cartera.
  const budgetByRep = new Map<string, { amount: number; units: number }>();
  for (const b of budgets ?? []) {
    const repId = repByClient.get(b.client_id);
    if (!repId) continue;
    const prev = budgetByRep.get(repId) ?? { amount: 0, units: 0 };
    budgetByRep.set(repId, {
      amount: prev.amount + Number(b.amount ?? 0),
      units: prev.units + Number(b.units ?? 0),
    });
  }

  // Indicadores por comercial: ASP, descuento ponderado y mix de producto.
  const statsByRep = new Map<string, { count: number; binaural: number; rechargeable: number; listTotal: number; discTotal: number }>();
  for (const s of sales ?? []) {
    if (!s.rep_id) continue;
    const st = statsByRep.get(s.rep_id) ?? { count: 0, binaural: 0, rechargeable: 0, listTotal: 0, discTotal: 0 };
    const list = Number(s.list_price ?? 0) * Number(s.units ?? 0);
    st.count += 1;
    if (s.binaural) st.binaural += 1;
    if (s.rechargeable) st.rechargeable += 1;
    st.listTotal += list;
    st.discTotal += list * (Number(s.discount_percent ?? 0) / 100);
    statsByRep.set(s.rep_id, st);
  }

  const chartData = repList.map((r) => {
    const b = budgetByRep.get(r.id) ?? { amount: 0, units: 0 };
    const a = actualByRep.get(r.id) ?? { amount: 0, units: 0 };
    const st = statsByRep.get(r.id);
    return {
      name: r.name,
      budgetAmount: b.amount, actualAmount: a.amount,
      budgetUnits: b.units, actualUnits: a.units,
      asp: a.units > 0 ? Math.round(a.amount / a.units) : 0,
      avgDiscount: st && st.listTotal > 0 ? Number(((st.discTotal / st.listTotal) * 100).toFixed(1)) : 0,
      binauralRate: st && st.count > 0 ? Number(((st.binaural / st.count) * 100).toFixed(1)) : 0,
      rechargeableRate: st && st.count > 0 ? Number(((st.rechargeable / st.count) * 100).toFixed(1)) : 0,
    };
  });

  // Serie mensual: una columna por comercial.
  const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const repNameById = new Map(repList.map((r) => [r.id, r.name]));
  const monthly = MONTH_LABELS.map((month) => {
    const row: { month: string; [rep: string]: string | number } = { month };
    for (const r of repList) row[r.name] = 0;
    return row;
  });
  for (const s of sales ?? []) {
    const name = s.rep_id ? repNameById.get(s.rep_id) : undefined;
    if (!name) continue;
    const i = Number(s.sold_on.slice(5, 7)) - 1;
    monthly[i][name] = Number(monthly[i][name] ?? 0) + Number(s.net_amount ?? 0);
  }

  // Ritmo: acumulado real contra acumulado presupuestado.
  const budgetByMonth = new Array(12).fill(0);
  for (const b of budgets ?? []) {
    if (repByClient.get(b.client_id)) budgetByMonth[b.month - 1] += Number(b.amount ?? 0);
  }
  const actualByMonth = new Array(12).fill(0);
  for (const s of sales ?? []) {
    actualByMonth[Number(s.sold_on.slice(5, 7)) - 1] += Number(s.net_amount ?? 0);
  }
  const isCurrentYear = year === new Date().getFullYear();
  const lastMonth = isCurrentYear ? new Date().getMonth() : 11;
  let accReal = 0;
  let accBudget = 0;
  const pace = MONTH_LABELS.map((month, i) => {
    accBudget += budgetByMonth[i];
    accReal += actualByMonth[i];
    return { month, presupuesto: accBudget, real: i <= lastMonth ? accReal : (null as unknown as number) };
  });

  const years = [year - 1, year, year + 1];

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Wholesale</p>
          <h1 className="text-2xl font-semibold mt-1">Comerciales {year}</h1>
          <p className="text-secondary text-sm mt-1">
            Presupuesto y cumplimiento de cada zona, en valores y en unidades.
          </p>
        </div>
        <div className="flex gap-2">
          {years.map((y) => (
            <Link
              key={y}
              href={`/wholesale/reps?year=${y}`}
              className={`h-10 leading-10 px-4 rounded-lg text-sm font-semibold transition ${
                y === year ? 'bg-primary text-white' : 'bg-white border border-border hover:border-primary'
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </header>

      {repList.length > 0 && (
        <div className="mb-8">
          <RepCharts
            data={chartData}
            monthly={monthly}
            pace={pace}
            repNames={repList.map((r) => r.name)}
          />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px] items-start">
        <div>
          {repList.length === 0 ? (
            <EmptyState
              emoji="🧭"
              title="Sin comerciales todavía"
              description="Crea el primer comercial de zona para poder asignarle clientes."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[880px] border-collapse [&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border">
                <thead className="bg-surface text-secondary">
                  <tr className="text-left">
                    <th className="px-5 py-3 font-semibold" rowSpan={2}>Comercial</th>
                    <th className="px-3 py-3 font-semibold text-right" rowSpan={2}>Clientes</th>
                    <th className="px-3 py-2 font-semibold text-center border-l border-border" colSpan={2}>Presupuesto</th>
                    <th className="px-3 py-2 font-semibold text-center border-l border-border" colSpan={2}>Real</th>
                    <th className="px-3 py-2 font-semibold text-center border-l border-border" colSpan={2}>Cumplimiento</th>
                  </tr>
                  <tr className="text-right text-xs">
                    <th className="px-3 pb-2 font-medium border-l border-border">Valor</th>
                    <th className="px-3 pb-2 font-medium">Und</th>
                    <th className="px-3 pb-2 font-medium border-l border-border">Valor</th>
                    <th className="px-3 pb-2 font-medium">Und</th>
                    <th className="px-3 pb-2 font-medium border-l border-border">Valor</th>
                    <th className="px-3 pb-2 font-medium">Und</th>
                  </tr>
                </thead>
                <tbody>
                  {repList.map((r) => {
                    const b = budgetByRep.get(r.id) ?? { amount: 0, units: 0 };
                    const a = actualByRep.get(r.id) ?? { amount: 0, units: 0 };
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-surface/60 transition">
                        <td className="px-5 py-3">
                          <Link href={`/wholesale/reps/${r.id}`} className="font-medium hover:underline">
                            {r.name}
                          </Link>
                          <p className="text-xs text-secondary">{r.zone ?? 'Sin zona'}</p>
                        </td>
                        <td className="px-3 py-3 text-right">{clientsByRep.get(r.id) ?? 0}</td>
                        <td className="px-3 py-3 text-right border-l border-border">
                          {b.amount > 0 ? cop(b.amount) : <span className="text-secondary">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right text-secondary">{b.units || '—'}</td>
                        <td className="px-3 py-3 text-right border-l border-border font-medium">{cop(a.amount)}</td>
                        <td className="px-3 py-3 text-right text-secondary">{a.units || '—'}</td>
                        <td className="px-3 py-3 text-right border-l border-border">
                          <Compliance actual={a.amount} budget={b.amount} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Compliance actual={a.units} budget={b.units} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-surface font-semibold">
                  {(() => {
                    const tb = repList.reduce(
                      (acc, r) => {
                        const b = budgetByRep.get(r.id) ?? { amount: 0, units: 0 };
                        const a = actualByRep.get(r.id) ?? { amount: 0, units: 0 };
                        return {
                          bAmount: acc.bAmount + b.amount, bUnits: acc.bUnits + b.units,
                          aAmount: acc.aAmount + a.amount, aUnits: acc.aUnits + a.units,
                        };
                      },
                      { bAmount: 0, bUnits: 0, aAmount: 0, aUnits: 0 },
                    );
                    return (
                      <tr>
                        <td className="px-5 py-3">Total canal</td>
                        <td className="px-3 py-3 text-right">
                          {[...clientsByRep.values()].reduce((a, n) => a + n, 0)}
                        </td>
                        <td className="px-3 py-3 text-right border-l border-border">{cop(tb.bAmount)}</td>
                        <td className="px-3 py-3 text-right">{tb.bUnits || '—'}</td>
                        <td className="px-3 py-3 text-right border-l border-border">{cop(tb.aAmount)}</td>
                        <td className="px-3 py-3 text-right">{tb.aUnits || '—'}</td>
                        <td className="px-3 py-3 text-right border-l border-border">
                          <Compliance actual={tb.aAmount} budget={tb.bAmount} />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <Compliance actual={tb.aUnits} budget={tb.bUnits} />
                        </td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <NewRepForm />
      </div>
    </WholesaleLayout>
  );
}
