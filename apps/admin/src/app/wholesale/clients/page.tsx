import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { EmptyState } from '@/components/wholesale/MetricCard';
import { RepPicker } from '@/components/wholesale/RepPicker';
import { requireWholesaleMe, cop } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

export default async function WholesaleClientsPage() {
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  const [{ data: clients }, { data: reps }, { data: sales }, { data: expenses }] = await Promise.all([
    supabase
      .from('wholesale_clients')
      .select('id, name, nit, city, zone, rep_id, is_active')
      .is('deleted_at', null)
      .order('name'),
    supabase.from('wholesale_reps').select('id, name, zone').eq('is_active', true).order('name'),
    supabase.from('wholesale_sales').select('client_id, net_amount, sold_on').is('deleted_at', null),
    supabase.from('wholesale_expenses').select('client_id, amount').is('deleted_at', null),
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

  const investByClient = new Map<string, number>();
  for (const e of expenses ?? []) {
    if (!e.client_id) continue;
    investByClient.set(e.client_id, (investByClient.get(e.client_id) ?? 0) + Number(e.amount ?? 0));
  }

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline="Wholesale"
        title="Clientes"
        subtitle={
          me.role === 'coordinator'
            ? 'Centros auditivos del canal, su comercial asignado y cuánto pesa cada uno.'
            : 'Los centros auditivos de tu zona.'
        }
        actions={
          me.role === 'coordinator' ? (
            <Link href="/wholesale/clients/new" className="wsale-btn">Nuevo cliente</Link>
          ) : undefined
        }
      />

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
                className="wsale-btn"
              >
                Nuevo cliente
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="wsale-panel overflow-hidden">
          <table className="wsale-table">
            <thead>
              <tr className="text-left">
                <th>Cliente</th>
                <th>Ciudad</th>
                <th>Comercial</th>
                <th className="num">Acumulado</th>
                <th className="num">Inversión</th>
                <th>Última venta</th>
              </tr>
            </thead>
            <tbody>
              {clientList.map((c) => (
                <tr key={c.id}>
                  <td >
                    <Link href={`/wholesale/clients/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    {c.nit && <p className="text-xs text-[var(--ink-soft)]">NIT {c.nit}</p>}
                  </td>
                  <td className="text-[var(--ink-soft)]">
                    {c.city ?? '—'}
                    {c.zone && <span className="text-xs block">{c.zone}</span>}
                  </td>
                  <td >
                    {me.role === 'coordinator' ? (
                      <RepPicker clientId={c.id} repId={c.rep_id} reps={repList} />
                    ) : (
                      (c.rep_id && repName.get(c.rep_id)) || 'Sin asignar'
                    )}
                  </td>
                  <td className="num wsale-figure text-[13px]">
                    {cop(revenueByClient.get(c.id) ?? 0)}
                  </td>
                  <td className="num">
                    {(() => {
                      const inv = investByClient.get(c.id) ?? 0;
                      const rev = revenueByClient.get(c.id) ?? 0;
                      if (inv === 0) return <span className="text-[var(--ink-soft)]">—</span>;
                      const share = rev > 0 ? inv / rev : null;
                      return (
                        <span className={share !== null && share > 0.15 ? 'wsale-warn' : ''}>
                          {cop(inv)}
                          {share !== null && (
                            <span className="text-[var(--ink-soft)] text-xs block">
                              {(share * 100).toFixed(1)}% de la venta
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="text-[var(--ink-soft)]">
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
