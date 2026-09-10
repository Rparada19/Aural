import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { EmptyState } from '@/components/wholesale/MetricCard';
import { requireWholesaleMe, cop } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

export default async function WholesaleBudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  const year = Number(yearParam) || new Date().getFullYear();
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const [{ data: clients }, { data: budgets }, { data: sales }] = await Promise.all([
    supabase
      .from('wholesale_clients')
      .select('id, name, city')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name'),
    supabase.from('wholesale_budgets').select('client_id, amount, units').eq('year', year),
    supabase
      .from('wholesale_sales')
      .select('client_id, units, net_amount')
      .is('deleted_at', null)
      .gte('sold_on', from)
      .lte('sold_on', to),
  ]);

  const clientList = clients ?? [];

  const budgetByClient = new Map<string, { amount: number; units: number }>();
  for (const b of budgets ?? []) {
    const prev = budgetByClient.get(b.client_id) ?? { amount: 0, units: 0 };
    budgetByClient.set(b.client_id, {
      amount: prev.amount + Number(b.amount ?? 0),
      units: prev.units + Number(b.units ?? 0),
    });
  }

  const actualByClient = new Map<string, { amount: number; units: number }>();
  for (const s of sales ?? []) {
    const prev = actualByClient.get(s.client_id) ?? { amount: 0, units: 0 };
    actualByClient.set(s.client_id, {
      amount: prev.amount + Number(s.net_amount ?? 0),
      units: prev.units + Number(s.units ?? 0),
    });
  }

  const years = [year - 1, year, year + 1];

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Wholesale</p>
          <h1 className="text-2xl font-semibold mt-1">Presupuestos {year}</h1>
          <p className="text-secondary text-sm mt-1">
            Meta mensual de cada cliente, en pesos y en unidades.
          </p>
        </div>
        <div className="flex gap-2">
          {years.map((y) => (
            <Link
              key={y}
              href={`/wholesale/budgets?year=${y}`}
              className={`h-10 leading-10 px-4 rounded-lg text-sm font-semibold transition ${
                y === year ? 'bg-primary text-white' : 'bg-white border border-border hover:border-primary'
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </header>

      {clientList.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="Primero necesitas clientes"
          description="El presupuesto se define por cliente. Carga la cartera y vuelve acá."
          action={
            <Link
              href="/wholesale/clients/new"
              className="inline-block h-11 leading-[44px] px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft transition"
            >
              Cargar cliente
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-secondary">
              <tr className="text-left">
                <th className="px-5 py-3 font-semibold">Cliente</th>
                <th className="px-5 py-3 font-semibold text-right">Presupuesto año</th>
                <th className="px-5 py-3 font-semibold text-right">Unidades</th>
                <th className="px-5 py-3 font-semibold text-right">Real</th>
                <th className="px-5 py-3 font-semibold text-right">Cumplimiento</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {clientList.map((c) => {
                const b = budgetByClient.get(c.id) ?? { amount: 0, units: 0 };
                const a = actualByClient.get(c.id) ?? { amount: 0, units: 0 };
                const ratio = b.amount > 0 ? a.amount / b.amount : null;
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-surface/60 transition">
                    <td className="px-5 py-3">
                      <p className="font-medium">{c.name}</p>
                      {c.city && <p className="text-xs text-secondary">{c.city}</p>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {b.amount > 0 ? cop(b.amount) : <span className="text-secondary">Sin definir</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-secondary">{b.units || '—'}</td>
                    <td className="px-5 py-3 text-right">{cop(a.amount)}</td>
                    <td className="px-5 py-3 text-right">
                      {ratio === null ? (
                        <span className="text-secondary">—</span>
                      ) : (
                        <span className={ratio >= 1 ? 'text-success font-semibold' : ratio >= 0.8 ? 'text-warning' : 'text-danger'}>
                          {Math.round(ratio * 100)}%
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {me.role === 'coordinator' && (
                        <Link
                          href={`/wholesale/budgets/${c.id}?year=${year}`}
                          className="text-primary font-semibold hover:underline"
                        >
                          Editar
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </WholesaleLayout>
  );
}
