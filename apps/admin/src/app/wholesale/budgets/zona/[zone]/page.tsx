import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { EmptyState } from '@/components/wholesale/MetricCard';
import { requireWholesaleMe, cop } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

const SIN_ZONA = 'Sin zona';

function Compliance({ actual, budget }: { actual: number; budget: number }) {
  if (budget <= 0) return <span className="text-[var(--ink-soft)]">—</span>;
  const ratio = actual / budget;
  return (
    <span className={ratio >= 1 ? 'wsale-good font-semibold' : ratio >= 0.8 ? 'wsale-warn' : 'wsale-bad'}>
      {Math.round(ratio * 100)}%
    </span>
  );
}

export default async function ZoneBudgetPage({
  params, searchParams,
}: {
  params: Promise<{ zone: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { zone: zoneParam } = await params;
  const { year: yearParam } = await searchParams;
  const zone = decodeURIComponent(zoneParam);
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  const year = Number(yearParam) || new Date().getFullYear();

  const [{ data: clients }, { data: budgets }, { data: sales }, { data: reps }] = await Promise.all([
    supabase
      .from('wholesale_clients')
      .select('id, name, city, zone, rep_id')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name'),
    supabase.from('wholesale_budgets').select('client_id, amount, units').eq('year', year),
    supabase
      .from('wholesale_sales')
      .select('client_id, units, net_amount')
      .is('deleted_at', null)
      .gte('sold_on', `${year}-01-01`)
      .lte('sold_on', `${year}-12-31`),
    supabase.from('wholesale_reps').select('id, name').is('deleted_at', null),
  ]);

  const inZone = (clients ?? []).filter((c) => (c.zone?.trim() || SIN_ZONA) === zone);
  const repName = new Map((reps ?? []).map((r) => [r.id, r.name]));

  const budgetByClient = new Map<string, { amount: number; units: number }>();
  for (const b of budgets ?? []) {
    const p = budgetByClient.get(b.client_id) ?? { amount: 0, units: 0 };
    budgetByClient.set(b.client_id, {
      amount: p.amount + Number(b.amount ?? 0),
      units: p.units + Number(b.units ?? 0),
    });
  }
  const actualByClient = new Map<string, { amount: number; units: number }>();
  for (const s of sales ?? []) {
    const p = actualByClient.get(s.client_id) ?? { amount: 0, units: 0 };
    actualByClient.set(s.client_id, {
      amount: p.amount + Number(s.net_amount ?? 0),
      units: p.units + Number(s.units ?? 0),
    });
  }

  const rows = inZone.map((c) => ({
    ...c,
    budget: budgetByClient.get(c.id) ?? { amount: 0, units: 0 },
    actual: actualByClient.get(c.id) ?? { amount: 0, units: 0 },
  })).sort((a, b) => b.budget.amount - a.budget.amount);

  const total = rows.reduce((acc, r) => ({
    budgetAmount: acc.budgetAmount + r.budget.amount,
    budgetUnits: acc.budgetUnits + r.budget.units,
    actualAmount: acc.actualAmount + r.actual.amount,
    actualUnits: acc.actualUnits + r.actual.units,
  }), { budgetAmount: 0, budgetUnits: 0, actualAmount: 0, actualUnits: 0 });

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline={`Presupuesto ${year}`}
        title={zone}
        subtitle={`${rows.length} cliente${rows.length === 1 ? '' : 's'} en la zona`}
        actions={
          <Link href={`/wholesale/budgets?year=${year}`} className="wsale-btn-ghost">
            Todas las zonas
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          emoji="🗺️"
          title="Esta zona no tiene clientes activos"
          description="Asigna centros auditivos a esta zona desde la ficha de cada cliente."
        />
      ) : (
        <div className="wsale-panel overflow-x-auto">
          <table className="wsale-table min-w-[840px]">
            <thead>
              <tr>
                <th rowSpan={2}>Cliente</th>
                <th className="text-center" colSpan={2}>Presupuesto</th>
                <th className="text-center" colSpan={2}>Real</th>
                <th className="text-center" colSpan={2}>Cumplimiento</th>
                <th className="px-3 py-3 font-semibold" rowSpan={2} />
              </tr>
              <tr>
                <th className="num">Valor</th>
                <th className="num">Und</th>
                <th className="num">Valor</th>
                <th className="num">Und</th>
                <th className="num">Valor</th>
                <th className="num">Und</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-[rgba(180,85,31,0.04)] transition">
                  <td >
                    <Link href={`/wholesale/budgets/${c.id}?year=${year}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-xs text-[var(--ink-soft)]">
                      {[c.city, c.rep_id ? repName.get(c.rep_id) : null].filter(Boolean).join(' · ')}
                    </p>
                  </td>
                  <td className="num">
                    {c.budget.amount > 0 ? cop(c.budget.amount) : <span className="text-[var(--ink-soft)]">Sin definir</span>}
                  </td>
                  <td className="num text-[var(--ink-soft)]">{c.budget.units || '—'}</td>
                  <td className="num wsale-figure text-[13px]">{cop(c.actual.amount)}</td>
                  <td className="num text-[var(--ink-soft)]">{c.actual.units || '—'}</td>
                  <td className="num">
                    <Compliance actual={c.actual.amount} budget={c.budget.amount} />
                  </td>
                  <td className="num">
                    <Compliance actual={c.actual.units} budget={c.budget.units} />
                  </td>
                  <td className="num">
                    {me.isCoordination && (
                      <Link
                        href={`/wholesale/budgets/${c.id}?year=${year}`}
                        className="text-[var(--accent)] font-medium hover:underline whitespace-nowrap"
                      >
                        Editar
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td >Total zona</td>
                <td className="num">{cop(total.budgetAmount)}</td>
                <td className="num">{total.budgetUnits || '—'}</td>
                <td className="num">{cop(total.actualAmount)}</td>
                <td className="num">{total.actualUnits || '—'}</td>
                <td className="num">
                  <Compliance actual={total.actualAmount} budget={total.budgetAmount} />
                </td>
                <td className="num">
                  <Compliance actual={total.actualUnits} budget={total.budgetUnits} />
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </WholesaleLayout>
  );
}
