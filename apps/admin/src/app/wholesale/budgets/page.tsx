import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { EmptyState } from '@/components/wholesale/MetricCard';
import { requireWholesaleMe, cop } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

const SIN_ZONA = 'Sin zona';

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function Compliance({ actual, budget }: { actual: number; budget: number }) {
  if (budget <= 0) return <span className="text-secondary">—</span>;
  const ratio = actual / budget;
  return (
    <span className={ratio >= 1 ? 'text-success font-semibold' : ratio >= 0.8 ? 'text-warning' : 'text-danger'}>
      {Math.round(ratio * 100)}%
    </span>
  );
}

export default async function WholesaleBudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  const year = Number(yearParam) || new Date().getFullYear();

  const [{ data: clients }, { data: budgets }, { data: sales }, { data: reps }] = await Promise.all([
    supabase
      .from('wholesale_clients')
      .select('id, name, city, zone, rep_id')
      .is('deleted_at', null)
      .eq('is_active', true),
    supabase.from('wholesale_budgets').select('client_id, month, amount, units').eq('year', year),
    supabase
      .from('wholesale_sales')
      .select('client_id, sold_on, units, net_amount')
      .is('deleted_at', null),
    supabase.from('wholesale_reps').select('id, name').is('deleted_at', null),
  ]);

  const clientList = clients ?? [];
  const repName = new Map((reps ?? []).map((r) => [r.id, r.name]));

  // El año en curso se juzga contra lo presupuestado hasta hoy; un año
  // pasado, contra sus doce meses.
  const now = new Date();
  const throughMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;
  const partialYear = throughMonth < 12;

  const budgetByClient = new Map<string, { amount: number; units: number }>();
  const fullBudgetByClient = new Map<string, { amount: number; units: number }>();
  for (const b of budgets ?? []) {
    const full = fullBudgetByClient.get(b.client_id) ?? { amount: 0, units: 0 };
    fullBudgetByClient.set(b.client_id, {
      amount: full.amount + Number(b.amount ?? 0),
      units: full.units + Number(b.units ?? 0),
    });
    if (b.month > throughMonth) continue;
    const p = budgetByClient.get(b.client_id) ?? { amount: 0, units: 0 };
    budgetByClient.set(b.client_id, {
      amount: p.amount + Number(b.amount ?? 0),
      units: p.units + Number(b.units ?? 0),
    });
  }

  const saleList = sales ?? [];
  const inYear = (d: string) => d.startsWith(String(year));

  const actualByClient = new Map<string, { amount: number; units: number }>();
  for (const s of saleList) {
    if (!inYear(s.sold_on)) continue;
    const p = actualByClient.get(s.client_id) ?? { amount: 0, units: 0 };
    actualByClient.set(s.client_id, {
      amount: p.amount + Number(s.net_amount ?? 0),
      units: p.units + Number(s.units ?? 0),
    });
  }

  // Primera y última compra de cada cliente, sobre todo el histórico
  const firstSale = new Map<string, string>();
  const lastSale = new Map<string, string>();
  for (const s of saleList) {
    const f = firstSale.get(s.client_id);
    if (!f || s.sold_on < f) firstSale.set(s.client_id, s.sold_on);
    const l = lastSale.get(s.client_id);
    if (!l || s.sold_on > l) lastSale.set(s.client_id, s.sold_on);
  }

  const zoneOf = (c: { zone: string | null }) => c.zone?.trim() || SIN_ZONA;

  // Nuevo = su primera compra de la historia cayó en este año
  const newClients = clientList
    .filter((c) => {
      const f = firstSale.get(c.id);
      return f !== undefined && inYear(f);
    })
    .map((c) => ({
      ...c,
      firstSale: firstSale.get(c.id)!,
      revenue: actualByClient.get(c.id)?.amount ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Inactivo = compró alguna vez, pero nada en los últimos 90 días
  const CUTOFF_DAYS = 90;
  const cutoff = new Date(Date.now() - CUTOFF_DAYS * 86_400_000).toISOString().slice(0, 10);
  const dormantClients = clientList
    .filter((c) => {
      const l = lastSale.get(c.id);
      return l !== undefined && l < cutoff;
    })
    .map((c) => {
      const hist = saleList.filter((s) => s.client_id === c.id);
      return {
        ...c,
        lastSale: lastSale.get(c.id)!,
        lifetime: hist.reduce((a, s) => a + Number(s.net_amount ?? 0), 0),
        purchases: hist.length,
      };
    })
    .sort((a, b) => b.lifetime - a.lifetime);

  // Zona que más clientes nuevos sumó
  const newByZone = new Map<string, number>();
  for (const c of newClients) {
    const z = zoneOf(c);
    newByZone.set(z, (newByZone.get(z) ?? 0) + 1);
  }
  const topNewZone = [...newByZone.entries()].sort((a, b) => b[1] - a[1])[0];

  // Agregado por zona
  const zones = new Map<string, {
    clients: number; reps: Set<string>;
    budget: { amount: number; units: number };
    ytd: { amount: number; units: number };
    actual: { amount: number; units: number };
  }>();
  for (const c of clientList) {
    const key = zoneOf(c);
    const z = zones.get(key) ?? {
      clients: 0, reps: new Set<string>(),
      budget: { amount: 0, units: 0 },
      ytd: { amount: 0, units: 0 },
      actual: { amount: 0, units: 0 },
    };
    const full = fullBudgetByClient.get(c.id) ?? { amount: 0, units: 0 };
    const ytd = budgetByClient.get(c.id) ?? { amount: 0, units: 0 };
    const a = actualByClient.get(c.id) ?? { amount: 0, units: 0 };
    z.clients += 1;
    if (c.rep_id) z.reps.add(c.rep_id);
    z.budget = { amount: z.budget.amount + full.amount, units: z.budget.units + full.units };
    z.ytd = { amount: z.ytd.amount + ytd.amount, units: z.ytd.units + ytd.units };
    z.actual = { amount: z.actual.amount + a.amount, units: z.actual.units + a.units };
    zones.set(key, z);
  }

  const zoneRows = [...zones.entries()].sort((a, b) => b[1].budget.amount - a[1].budget.amount);
  const total = zoneRows.reduce((acc, [, z]) => ({
    budgetAmount: acc.budgetAmount + z.budget.amount,
    budgetUnits: acc.budgetUnits + z.budget.units,
    ytdAmount: acc.ytdAmount + z.ytd.amount,
    ytdUnits: acc.ytdUnits + z.ytd.units,
    actualAmount: acc.actualAmount + z.actual.amount,
    actualUnits: acc.actualUnits + z.actual.units,
    clients: acc.clients + z.clients,
  }), { budgetAmount: 0, budgetUnits: 0, ytdAmount: 0, ytdUnits: 0, actualAmount: 0, actualUnits: 0, clients: 0 });

  const years = [year - 2, year - 1, year, year + 1];

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Wholesale</p>
          <h1 className="text-2xl font-semibold mt-1">Presupuestos {year}</h1>
          <p className="text-secondary text-sm mt-1">
            Por zona. Entra a una para ver sus clientes mes a mes.
            {partialYear && ` El cumplimiento compara contra lo presupuestado hasta ${MONTH_NAMES[throughMonth - 1]}.`}
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

      {clientList.length > 0 && (
        <>
          <section className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Clientes nuevos {year}
              </p>
              <p className="text-2xl font-semibold mt-2 text-success">{newClients.length}</p>
              <p className="text-xs text-secondary mt-1">
                {newClients.length > 0
                  ? `${cop(newClients.reduce((a, c) => a + c.revenue, 0))} facturados`
                  : 'Ningún centro estrenó compra este año'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Dejaron de comprar
              </p>
              <p className={`text-2xl font-semibold mt-2 ${dormantClients.length > 0 ? 'text-danger' : ''}`}>
                {dormantClients.length}
              </p>
              <p className="text-xs text-secondary mt-1">
                Sin comprar hace más de {CUTOFF_DAYS} días
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Zona con más nuevos
              </p>
              <p className="text-2xl font-semibold mt-2">{topNewZone ? topNewZone[0] : '—'}</p>
              <p className="text-xs text-secondary mt-1">
                {topNewZone
                  ? `${topNewZone[1]} cliente${topNewZone[1] === 1 ? '' : 's'} nuevo${topNewZone[1] === 1 ? '' : 's'}`
                  : 'Sin clientes nuevos este año'}
              </p>
            </div>
          </section>

          {(newClients.length > 0 || dormantClients.length > 0) && (
            <section className="grid gap-6 lg:grid-cols-2 mb-8">
              {newClients.length > 0 && (
                <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                  <h2 className="font-semibold">Nuevos este año</h2>
                  <p className="text-secondary text-xs mt-1 mb-4">
                    Centros cuya primera compra de la historia ocurrió en {year}.
                  </p>
                  <ul className="space-y-2">
                    {newClients.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 text-sm">
                        <Link href={`/wholesale/clients/${c.id}`} className="flex-1 truncate hover:underline">
                          {c.name}
                          <span className="text-secondary text-xs block">
                            {[zoneOf(c), `desde ${c.firstSale}`].join(' · ')}
                          </span>
                        </Link>
                        <span className="font-medium whitespace-nowrap">{cop(c.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {dormantClients.length > 0 && (
                <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                  <h2 className="font-semibold">Compraban y dejaron de comprar</h2>
                  <p className="text-secondary text-xs mt-1 mb-4">
                    Tienen historial pero llevan más de {CUTOFF_DAYS} días sin facturar.
                  </p>
                  <ul className="space-y-2">
                    {dormantClients.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 text-sm">
                        <Link href={`/wholesale/clients/${c.id}`} className="flex-1 truncate hover:underline">
                          {c.name}
                          <span className="text-secondary text-xs block">
                            {zoneOf(c)} · última compra {c.lastSale}
                          </span>
                        </Link>
                        <span className="text-secondary text-xs whitespace-nowrap">
                          {c.purchases} compras
                          <span className="block text-foreground font-medium">{cop(c.lifetime)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {clientList.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="Primero necesitas clientes"
          description="El presupuesto se define por cliente y se agrupa por zona. Carga la cartera y vuelve acá."
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
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[840px] border-collapse [&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border">
            <thead className="bg-surface text-secondary">
              <tr className="text-left">
                <th className="px-5 py-3 font-semibold" rowSpan={2}>Zona</th>
                <th className="px-3 py-3 font-semibold text-right" rowSpan={2}>Clientes</th>
                <th className="px-3 py-2 font-semibold text-center" colSpan={2}>Presupuesto</th>
                <th className="px-3 py-2 font-semibold text-center" colSpan={2}>Real</th>
                <th className="px-3 py-2 font-semibold text-center" colSpan={2}>
                  Cumplimiento
                  {partialYear && <span className="block text-[10px] font-normal normal-case">a {MONTH_NAMES[throughMonth - 1]}</span>}
                </th>
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
              {zoneRows.map(([zone, z]) => (
                <tr key={zone} className="hover:bg-surface/60 transition">
                  <td className="px-5 py-3">
                    <Link
                      href={`/wholesale/budgets/zona/${encodeURIComponent(zone)}?year=${year}`}
                      className="font-medium hover:underline"
                    >
                      {zone}
                    </Link>
                    <p className="text-xs text-secondary">
                      {[...z.reps].map((id) => repName.get(id)).filter(Boolean).join(', ') || 'Sin comercial'}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right">{z.clients}</td>
                  <td className="px-3 py-3 text-right">
                    {z.budget.amount > 0 ? cop(z.budget.amount) : <span className="text-secondary">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-secondary">{z.budget.units || '—'}</td>
                  <td className="px-3 py-3 text-right font-medium">{cop(z.actual.amount)}</td>
                  <td className="px-3 py-3 text-right text-secondary">{z.actual.units || '—'}</td>
                  <td className="px-3 py-3 text-right">
                    <Compliance actual={z.actual.amount} budget={z.ytd.amount} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Compliance actual={z.actual.units} budget={z.ytd.units} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface font-semibold">
              <tr>
                <td className="px-5 py-3">Total canal</td>
                <td className="px-3 py-3 text-right">{total.clients}</td>
                <td className="px-3 py-3 text-right">{cop(total.budgetAmount)}</td>
                <td className="px-3 py-3 text-right">{total.budgetUnits || '—'}</td>
                <td className="px-3 py-3 text-right">{cop(total.actualAmount)}</td>
                <td className="px-3 py-3 text-right">{total.actualUnits || '—'}</td>
                <td className="px-3 py-3 text-right">
                  <Compliance actual={total.actualAmount} budget={total.ytdAmount} />
                </td>
                <td className="px-3 py-3 text-right">
                  <Compliance actual={total.actualUnits} budget={total.ytdUnits} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </WholesaleLayout>
  );
}
