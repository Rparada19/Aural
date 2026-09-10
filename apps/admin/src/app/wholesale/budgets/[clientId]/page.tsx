import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { BudgetGrid } from '@/components/wholesale/BudgetGrid';
import { requireWholesaleMe, cop } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

function YearRatio({ actual, budget }: { actual: number; budget: number }) {
  if (budget <= 0) return <span className="text-[var(--ink-soft)]">—</span>;
  const ratio = actual / budget;
  return (
    <span className={ratio >= 1 ? 'wsale-good font-semibold' : ratio >= 0.8 ? 'wsale-warn' : 'wsale-bad'}>
      {Math.round(ratio * 100)}%
    </span>
  );
}

export default async function WholesaleBudgetDetail({
  params, searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { clientId } = await params;
  const { year: yearParam } = await searchParams;
  const me = await requireWholesaleMe();
  if (!me.isCoordination) redirect('/wholesale/budgets');

  const year = Number(yearParam) || new Date().getFullYear();
  const supabase = await createSupabaseServerClient();

  const [{ data: client }, { data: budgets }, { data: sales }] = await Promise.all([
    supabase
      .from('wholesale_clients')
      .select('id, name, city, zone')
      .eq('id', clientId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('wholesale_budgets')
      .select('year, month, amount, units')
      .eq('client_id', clientId),
    supabase
      .from('wholesale_sales')
      .select('sold_on, units, net_amount')
      .eq('client_id', clientId)
      .is('deleted_at', null),
  ]);

  if (!client) notFound();

  const yearBudgets = (budgets ?? []).filter((b) => b.year === year);

  const actualByMonth = Array.from({ length: 12 }, () => ({ amount: 0, units: 0 }));
  for (const s of sales ?? []) {
    if (!s.sold_on.startsWith(String(year))) continue;
    const i = Number(s.sold_on.slice(5, 7)) - 1;
    actualByMonth[i].amount += Number(s.net_amount ?? 0);
    actualByMonth[i].units += Number(s.units ?? 0);
  }

  // Histórico: un renglón por año con presupuesto y real
  const historyMap = new Map<number, {
    budgetAmount: number; budgetUnits: number; actualAmount: number; actualUnits: number;
  }>();
  const touch = (y: number) => {
    if (!historyMap.has(y)) {
      historyMap.set(y, { budgetAmount: 0, budgetUnits: 0, actualAmount: 0, actualUnits: 0 });
    }
    return historyMap.get(y)!;
  };
  for (const b of budgets ?? []) {
    const row = touch(b.year);
    row.budgetAmount += Number(b.amount ?? 0);
    row.budgetUnits += Number(b.units ?? 0);
  }
  for (const s of sales ?? []) {
    const row = touch(Number(s.sold_on.slice(0, 4)));
    row.actualAmount += Number(s.net_amount ?? 0);
    row.actualUnits += Number(s.units ?? 0);
  }
  const history = [...historyMap.entries()].sort((a, b) => b[0] - a[0]);
  const lifetime = history.reduce((acc, [, r]) => ({
    budgetAmount: acc.budgetAmount + r.budgetAmount,
    budgetUnits: acc.budgetUnits + r.budgetUnits,
    actualAmount: acc.actualAmount + r.actualAmount,
    actualUnits: acc.actualUnits + r.actualUnits,
  }), { budgetAmount: 0, budgetUnits: 0, actualAmount: 0, actualUnits: 0 });

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8">
        <Link
          href={
            client.zone
              ? `/wholesale/budgets/zona/${encodeURIComponent(client.zone)}?year=${year}`
              : `/wholesale/budgets?year=${year}`
          }
          className="text-[var(--ink-soft)] text-sm hover:underline"
        >
          ← {client.zone || 'Presupuestos'}
        </Link>
        <h1 className="text-2xl font-semibold mt-2">{client.name}</h1>
        <p className="text-[var(--ink-soft)] text-sm mt-1">
          {[client.city, client.zone].filter(Boolean).join(' · ')} · presupuesto mes a mes
        </p>

        <div className="flex gap-2 mt-4">
          {[year - 2, year - 1, year, year + 1].map((y) => (
            <Link
              key={y}
              href={`/wholesale/budgets/${clientId}?year=${y}`}
              className="wsale-chip" data-on={y === year}
            >
              {y}
            </Link>
          ))}
        </div>
      </header>

      <BudgetGrid
        clientId={client.id}
        year={year}
        initial={yearBudgets.map((b) => ({
          month: b.month,
          amount: Number(b.amount ?? 0),
          units: Number(b.units ?? 0),
        }))}
        actualByMonth={actualByMonth}
      />

      {history.length > 0 && (
        <section className="mt-8 wsale-panel overflow-x-auto">
          <div className="px-5 pt-5">
            <h2 className="font-semibold">Histórico</h2>
            <p className="text-[var(--ink-soft)] text-xs mt-1">
              Todos los años registrados de este cliente, con su acumulado.
            </p>
          </div>
          <table className="w-full text-sm mt-4 min-w-[640px] border-collapse [&_th]:border [&_th]:border-[var(--rule)] [&_td]:border [&_td]:border-[var(--rule)]">
            <thead>
              <tr className="text-left">
                <th className="px-5 py-3 font-semibold" rowSpan={2}>Año</th>
                <th className="px-3 py-2 font-semibold text-center" colSpan={2}>Presupuesto</th>
                <th className="px-3 py-2 font-semibold text-center" colSpan={2}>Real</th>
                <th className="px-3 py-2 font-semibold text-center" colSpan={2}>Cumplimiento</th>
              </tr>
              <tr className="text-right text-xs">
                <th className="px-3 pb-2 font-medium">Valor</th>
                <th className="px-3 pb-2 font-medium">Und</th>
                <th className="px-3 pb-2 font-medium">Valor</th>
                <th className="px-3 pb-2 font-medium">Und</th>
                <th className="px-3 pb-2 font-medium">Valor</th>
                <th className="px-3 pb-2 font-medium">Und</th>
              </tr>
            </thead>
            <tbody>
              {history.map(([y, r]) => (
                <tr key={y} className={y === year ? 'bg-[rgba(180,85,31,0.05)]' : ''}>
                  <td className="px-5 py-3">
                    <Link href={`/wholesale/budgets/${clientId}?year=${y}`} className="font-medium hover:underline">
                      {y}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right">{r.budgetAmount > 0 ? cop(r.budgetAmount) : '—'}</td>
                  <td className="px-3 py-3 text-right text-[var(--ink-soft)]">{r.budgetUnits || '—'}</td>
                  <td className="px-3 py-3 text-right font-medium">{cop(r.actualAmount)}</td>
                  <td className="px-3 py-3 text-right text-[var(--ink-soft)]">{r.actualUnits || '—'}</td>
                  <td className="px-3 py-3 text-right">
                    <YearRatio actual={r.actualAmount} budget={r.budgetAmount} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <YearRatio actual={r.actualUnits} budget={r.budgetUnits} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-5 py-3">Acumulado</td>
                <td className="px-3 py-3 text-right">{cop(lifetime.budgetAmount)}</td>
                <td className="px-3 py-3 text-right">{lifetime.budgetUnits || '—'}</td>
                <td className="px-3 py-3 text-right">{cop(lifetime.actualAmount)}</td>
                <td className="px-3 py-3 text-right">{lifetime.actualUnits || '—'}</td>
                <td className="px-3 py-3 text-right">
                  <YearRatio actual={lifetime.actualAmount} budget={lifetime.budgetAmount} />
                </td>
                <td className="px-3 py-3 text-right">
                  <YearRatio actual={lifetime.actualUnits} budget={lifetime.budgetUnits} />
                </td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}
    </WholesaleLayout>
  );
}
