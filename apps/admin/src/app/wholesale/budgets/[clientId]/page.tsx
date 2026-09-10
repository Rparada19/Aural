import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { BudgetGrid } from '@/components/wholesale/BudgetGrid';
import { requireWholesaleMe } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

export default async function WholesaleBudgetDetail({
  params, searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { clientId } = await params;
  const { year: yearParam } = await searchParams;
  const me = await requireWholesaleMe();
  if (me.role !== 'coordinator') redirect('/wholesale/budgets');

  const year = Number(yearParam) || new Date().getFullYear();
  const supabase = await createSupabaseServerClient();

  const [{ data: client }, { data: budgets }, { data: sales }] = await Promise.all([
    supabase
      .from('wholesale_clients')
      .select('id, name, city')
      .eq('id', clientId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('wholesale_budgets')
      .select('month, amount, units')
      .eq('client_id', clientId)
      .eq('year', year),
    supabase
      .from('wholesale_sales')
      .select('sold_on, units, net_amount')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .gte('sold_on', `${year}-01-01`)
      .lte('sold_on', `${year}-12-31`),
  ]);

  if (!client) notFound();

  const actualByMonth = Array.from({ length: 12 }, () => ({ amount: 0, units: 0 }));
  for (const s of sales ?? []) {
    const i = Number(s.sold_on.slice(5, 7)) - 1;
    actualByMonth[i].amount += Number(s.net_amount ?? 0);
    actualByMonth[i].units += Number(s.units ?? 0);
  }

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8">
        <Link href={`/wholesale/budgets?year=${year}`} className="text-secondary text-sm hover:underline">
          ← Presupuestos
        </Link>
        <h1 className="text-2xl font-semibold mt-2">{client.name}</h1>
        <p className="text-secondary text-sm mt-1">Presupuesto {year}, mes a mes.</p>
      </header>

      <BudgetGrid
        clientId={client.id}
        year={year}
        initial={(budgets ?? []).map((b) => ({
          month: b.month,
          amount: Number(b.amount ?? 0),
          units: Number(b.units ?? 0),
        }))}
        actualByMonth={actualByMonth}
      />
    </WholesaleLayout>
  );
}
