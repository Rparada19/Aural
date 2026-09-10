import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { EmptyState } from '@/components/wholesale/MetricCard';
import { RepPicker } from '@/components/wholesale/RepPicker';
import { requireWholesaleMe, cop } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

export default async function WholesaleClientsPage() {
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  const [{ data: clients }, { data: reps }, { data: sales }] = await Promise.all([
    supabase
      .from('wholesale_clients')
      .select('id, name, nit, city, zone, rep_id, is_active')
      .is('deleted_at', null)
      .order('name'),
    supabase.from('wholesale_reps').select('id, name, zone').eq('is_active', true).order('name'),
    supabase.from('wholesale_sales').select('client_id, net_amount, sold_on').is('deleted_at', null),
  ]);

  const clientList = clients ?? [];
  const repList = reps ?? [];
  const repName = new Map(repList.map((r) => [r.id, r.name]));

  const revenueByClient = new Map<string, number>();
  const lastSaleByClient = new Map<string, string>();
  for (const s of sales ?? []) {
    revenueByClient.set(s.client_id, (revenueByClient.get(s.client_id) ?? 0) + Number(s.net_amount ?? 0));
    const prev = lastSaleByClient.get(s.client_id);
    if (!prev || s.sold_on > prev) lastSaleByClient.set(s.client_id, s.sold_on);
  }

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Wholesale</p>
          <h1 className="text-2xl font-semibold mt-1">Clientes</h1>
          <p className="text-secondary text-sm mt-1">
            {me.role === 'coordinator'
              ? 'Centros auditivos del canal y su comercial asignado.'
              : 'Los centros auditivos de tu zona.'}
          </p>
        </div>
        {me.role === 'coordinator' && (
          <Link
            href="/wholesale/clients/new"
            className="h-11 leading-[44px] px-5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft transition"
          >
            Nuevo cliente
          </Link>
        )}
      </header>

      {clientList.length === 0 ? (
        <EmptyState
          emoji="🏥"
          title="Sin clientes todavía"
          description={
            me.role === 'coordinator'
              ? 'Carga el primer centro auditivo y asígnalo a un comercial de zona.'
              : 'Cuando coordinación te asigne clientes, aparecerán aquí.'
          }
          action={
            me.role === 'coordinator' ? (
              <Link
                href="/wholesale/clients/new"
                className="inline-block h-11 leading-[44px] px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft transition"
              >
                Nuevo cliente
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-secondary">
              <tr className="text-left">
                <th className="px-5 py-3 font-semibold">Cliente</th>
                <th className="px-5 py-3 font-semibold">Ciudad</th>
                <th className="px-5 py-3 font-semibold">Comercial</th>
                <th className="px-5 py-3 font-semibold text-right">Acumulado</th>
                <th className="px-5 py-3 font-semibold">Última venta</th>
              </tr>
            </thead>
            <tbody>
              {clientList.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-surface/60 transition">
                  <td className="px-5 py-3">
                    <Link href={`/wholesale/clients/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    {c.nit && <p className="text-xs text-secondary">NIT {c.nit}</p>}
                  </td>
                  <td className="px-5 py-3 text-secondary">
                    {c.city ?? '—'}
                    {c.zone && <span className="text-xs block">{c.zone}</span>}
                  </td>
                  <td className="px-5 py-3">
                    {me.role === 'coordinator' ? (
                      <RepPicker clientId={c.id} repId={c.rep_id} reps={repList} />
                    ) : (
                      (c.rep_id && repName.get(c.rep_id)) || 'Sin asignar'
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">
                    {cop(revenueByClient.get(c.id) ?? 0)}
                  </td>
                  <td className="px-5 py-3 text-secondary">
                    {lastSaleByClient.get(c.id) ?? 'Sin ventas'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WholesaleLayout>
  );
}
