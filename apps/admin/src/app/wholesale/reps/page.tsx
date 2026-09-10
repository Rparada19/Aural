import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { EmptyState } from '@/components/wholesale/MetricCard';
import { NewRepForm } from '@/components/wholesale/NewRepForm';
import { requireWholesaleMe, cop } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

export default async function WholesaleRepsPage() {
  const me = await requireWholesaleMe();
  if (me.role !== 'coordinator') redirect('/wholesale');

  const supabase = await createSupabaseServerClient();
  const [{ data: reps }, { data: clients }, { data: sales }] = await Promise.all([
    supabase.from('wholesale_reps').select('id, name, zone, phone, email').is('deleted_at', null).order('name'),
    supabase.from('wholesale_clients').select('id, rep_id').is('deleted_at', null),
    supabase.from('wholesale_sales').select('rep_id, net_amount').is('deleted_at', null),
  ]);

  const repList = reps ?? [];
  const clientsByRep = new Map<string, number>();
  for (const c of clients ?? []) {
    if (c.rep_id) clientsByRep.set(c.rep_id, (clientsByRep.get(c.rep_id) ?? 0) + 1);
  }
  const revenueByRep = new Map<string, number>();
  for (const s of sales ?? []) {
    if (s.rep_id) revenueByRep.set(s.rep_id, (revenueByRep.get(s.rep_id) ?? 0) + Number(s.net_amount ?? 0));
  }

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Wholesale</p>
        <h1 className="text-2xl font-semibold mt-1">Comerciales</h1>
        <p className="text-secondary text-sm mt-1">Quién cubre cada zona y cuánta cartera tiene.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px] items-start">
        <div>
          {repList.length === 0 ? (
            <EmptyState
              emoji="🧭"
              title="Sin comerciales todavía"
              description="Crea el primer comercial de zona para poder asignarle clientes."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface text-secondary">
                  <tr className="text-left">
                    <th className="px-5 py-3 font-semibold">Comercial</th>
                    <th className="px-5 py-3 font-semibold">Zona</th>
                    <th className="px-5 py-3 font-semibold text-right">Clientes</th>
                    <th className="px-5 py-3 font-semibold text-right">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {repList.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-5 py-3">
                        <p className="font-medium">{r.name}</p>
                        {r.email && <p className="text-xs text-secondary">{r.email}</p>}
                      </td>
                      <td className="px-5 py-3 text-secondary">{r.zone ?? '—'}</td>
                      <td className="px-5 py-3 text-right">{clientsByRep.get(r.id) ?? 0}</td>
                      <td className="px-5 py-3 text-right font-semibold">{cop(revenueByRep.get(r.id) ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <NewRepForm />
      </div>
    </WholesaleLayout>
  );
}
