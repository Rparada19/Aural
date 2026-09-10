import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { MetricCard, EmptyState } from '@/components/wholesale/MetricCard';
import { requireWholesaleMe, salesMetrics, cop, pct } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

export default async function WholesaleSalesPage() {
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  const [{ data: sales }, { data: clients }, { data: styles }] = await Promise.all([
    supabase
      .from('wholesale_sales')
      .select('id, client_id, sold_on, invoice_number, patient_name, units, binaural, rechargeable, style, discount_percent, net_amount')
      .is('deleted_at', null)
      .order('sold_on', { ascending: false })
      .limit(200),
    supabase.from('wholesale_clients').select('id, name').is('deleted_at', null),
    supabase.from('wholesale_product_styles').select('slug, label'),
  ]);

  const saleList = sales ?? [];
  const nameById = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const styleLabel = new Map((styles ?? []).map((s) => [s.slug, s.label]));
  const all = salesMetrics(saleList);

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Wholesale</p>
          <h1 className="text-2xl font-semibold mt-1">Ventas</h1>
          <p className="text-secondary text-sm mt-1">Las últimas 200 facturas del canal.</p>
        </div>
        <Link
          href="/wholesale/sales/new"
          className="h-11 leading-[44px] px-5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft transition"
        >
          Registrar venta
        </Link>
      </header>

      {saleList.length === 0 ? (
        <EmptyState
          emoji="💳"
          title="Aún no hay ventas cargadas"
          description="Registra la primera factura y el canal empieza a mostrar ASP, binauralidad y recargabilidad."
          action={
            <Link
              href="/wholesale/sales/new"
              className="inline-block h-11 leading-[44px] px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft transition"
            >
              Registrar venta
            </Link>
          }
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <MetricCard label="Total" value={cop(all.revenue)} hint={`${all.count} facturas`} />
            <MetricCard label="ASP" value={all.asp > 0 ? cop(all.asp) : '—'} hint={`${all.units} unidades`} />
            <MetricCard label="Binaurales" value={pct(all.binauralRate)} tone={all.binauralRate >= 0.5 ? 'success' : 'warning'} />
            <MetricCard label="Recargables" value={pct(all.rechargeableRate)} tone={all.rechargeableRate >= 0.5 ? 'success' : 'warning'} />
          </section>

          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface text-secondary">
                <tr className="text-left">
                  <th className="px-5 py-3 font-semibold">Fecha</th>
                  <th className="px-5 py-3 font-semibold">Cliente</th>
                  <th className="px-5 py-3 font-semibold">Factura</th>
                  <th className="px-5 py-3 font-semibold">Detalle</th>
                  <th className="px-5 py-3 font-semibold text-right">Dcto.</th>
                  <th className="px-5 py-3 font-semibold text-right">Neto</th>
                </tr>
              </thead>
              <tbody>
                {saleList.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-surface/60 transition">
                    <td className="px-5 py-3">{s.sold_on}</td>
                    <td className="px-5 py-3">
                      <Link href={`/wholesale/clients/${s.client_id}`} className="hover:underline">
                        {nameById.get(s.client_id) ?? 'Cliente'}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-secondary">{s.invoice_number ?? '—'}</td>
                    <td className="px-5 py-3 text-secondary">
                      {s.units} und · {s.binaural ? 'binaural' : 'unilateral'} ·{' '}
                      {s.rechargeable ? 'recargable' : 'batería'}
                      {s.style && ` · ${styleLabel.get(s.style) ?? s.style}`}
                    </td>
                    <td className="px-5 py-3 text-right text-secondary">{Number(s.discount_percent)}%</td>
                    <td className="px-5 py-3 text-right font-semibold">{cop(Number(s.net_amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </WholesaleLayout>
  );
}
