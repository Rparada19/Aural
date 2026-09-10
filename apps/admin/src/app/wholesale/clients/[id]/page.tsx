import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { MetricCard, EmptyState } from '@/components/wholesale/MetricCard';
import { requireWholesaleMe, salesMetrics, cop, pct } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

export default async function WholesaleClientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  const [{ data: client }, { data: sales }, { data: reps }, { data: expenses }, { data: expenseCats }, { data: styles }] = await Promise.all([
    supabase
      .from('wholesale_clients')
      .select('id, name, nit, contact_name, phone, email, city, zone, rep_id, notes')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('wholesale_sales')
      .select('id, sold_on, invoice_number, patient_name, units, binaural, rechargeable, style, discount_percent, net_amount')
      .eq('client_id', id)
      .is('deleted_at', null)
      .order('sold_on', { ascending: false }),
    supabase.from('wholesale_reps').select('id, name').eq('is_active', true),
    supabase
      .from('wholesale_expenses')
      .select('id, category, spent_on, amount, description')
      .eq('client_id', id)
      .is('deleted_at', null)
      .order('spent_on', { ascending: false }),
    supabase.from('wholesale_expense_categories').select('slug, label, icon'),
    supabase.from('wholesale_product_styles').select('slug, label'),
  ]);

  if (!client) notFound();

  const saleList = sales ?? [];
  const all = salesMetrics(saleList);
  const repName = (reps ?? []).find((r) => r.id === client.rep_id)?.name;

  const styleLabel = new Map((styles ?? []).map((s) => [s.slug, s.label]));
  const expenseList = expenses ?? [];
  const invested = expenseList.reduce((a, e) => a + Number(e.amount ?? 0), 0);
  const catIcon = new Map((expenseCats ?? []).map((c) => [c.slug, c.icon]));
  const catLabel = new Map((expenseCats ?? []).map((c) => [c.slug, c.label]));
  const investRatio = all.revenue > 0 ? invested / all.revenue : null;

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link href="/wholesale/clients" className="text-[var(--ink-soft)] text-sm hover:underline">
            ← Clientes
          </Link>
          <h1 className="text-2xl font-semibold mt-2">{client.name}</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">
            {[client.city, client.zone, repName && `Comercial: ${repName}`]
              .filter(Boolean)
              .join(' · ') || 'Sin datos de zona'}
          </p>
        </div>
        <Link
          href={`/wholesale/sales/new?client=${client.id}`}
          className="wsale-btn"
        >
          Registrar venta
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Acumulado" value={cop(all.revenue)} hint={`${all.count} venta${all.count === 1 ? '' : 's'}`} />
        <MetricCard label="ASP" value={all.asp > 0 ? cop(all.asp) : '—'} hint={`${all.units} unidades`} />
        <MetricCard
          label="Binaurales"
          value={all.count > 0 ? pct(all.binauralRate) : '—'}
          tone={all.binauralRate >= 0.5 ? 'success' : 'warning'}
        />
        <MetricCard
          label="Recargables"
          value={all.count > 0 ? pct(all.rechargeableRate) : '—'}
          tone={all.rechargeableRate >= 0.5 ? 'success' : 'warning'}
        />
        <MetricCard
          label="Inversión"
          value={cop(invested)}
          hint={
            investRatio === null
              ? 'Gastos imputados a este cliente'
              : `${(investRatio * 100).toFixed(1)}% de lo vendido`
          }
          tone={investRatio !== null && investRatio > 0.15 ? 'warning' : 'neutral'}
        />
      </section>

      {expenseList.length > 0 && (
        <section className="mt-8 wsale-panel p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-semibold">Inversión en este cliente</h2>
            <p className="text-[var(--ink-soft)] text-sm">{cop(invested)} en {expenseList.length} gasto{expenseList.length === 1 ? '' : 's'}</p>
          </div>
          <div className="space-y-2">
            {expenseList.slice(0, 12).map((e) => (
              <div key={e.id} className="flex items-center gap-3 text-sm border-b border-[var(--rule)] pb-2 last:border-0">
                <span aria-hidden title={catLabel.get(e.category)}>{catIcon.get(e.category) ?? '💸'}</span>
                <span className="flex-1 truncate">{e.description || catLabel.get(e.category) || 'Gasto'}</span>
                <span className="text-[var(--ink-soft)] text-xs">{e.spent_on}</span>
                <span className="font-medium w-28 text-right">{cop(Number(e.amount))}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {(client.contact_name || client.phone || client.email || client.notes) && (
        <section className="mt-8 wsale-panel p-6">
          <h2 className="font-semibold">Contacto</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
            {client.contact_name && (
              <div><dt className="text-[var(--ink-soft)] text-xs uppercase tracking-wider">Persona</dt><dd>{client.contact_name}</dd></div>
            )}
            {client.phone && (
              <div><dt className="text-[var(--ink-soft)] text-xs uppercase tracking-wider">Teléfono</dt><dd>{client.phone}</dd></div>
            )}
            {client.email && (
              <div><dt className="text-[var(--ink-soft)] text-xs uppercase tracking-wider">Correo</dt><dd className="truncate">{client.email}</dd></div>
            )}
          </dl>
          {client.notes && <p className="text-[var(--ink-soft)] text-sm mt-4">{client.notes}</p>}
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-semibold mb-4">Ventas</h2>
        {saleList.length === 0 ? (
          <EmptyState
            emoji="💳"
            title="Sin ventas registradas"
            description="Cuando cargues la primera factura de este cliente, aquí verás su histórico y sus indicadores."
            action={
              <Link
                href={`/wholesale/sales/new?client=${client.id}`}
                className="wsale-btn"
              >
                Registrar venta
              </Link>
            }
          />
        ) : (
          <div className="wsale-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-5 py-3 font-semibold">Fecha</th>
                  <th className="px-5 py-3 font-semibold">Factura</th>
                  <th className="px-5 py-3 font-semibold">Paciente</th>
                  <th className="px-5 py-3 font-semibold">Detalle</th>
                  <th className="px-5 py-3 font-semibold text-right">Dcto.</th>
                  <th className="px-5 py-3 font-semibold text-right">Neto</th>
                </tr>
              </thead>
              <tbody>
                {saleList.map((s) => (
                  <tr key={s.id} className="border-t border-[var(--rule)]">
                    <td className="px-5 py-3">{s.sold_on}</td>
                    <td className="px-5 py-3 text-[var(--ink-soft)]">{s.invoice_number ?? '—'}</td>
                    <td className="px-5 py-3">{s.patient_name ?? '—'}</td>
                    <td className="px-5 py-3 text-[var(--ink-soft)]">
                      {s.units} und · {s.binaural ? 'binaural' : 'unilateral'} ·{' '}
                      {s.rechargeable ? 'recargable' : 'batería'}
                      {s.style && ` · ${styleLabel.get(s.style) ?? s.style}`}
                    </td>
                    <td className="px-5 py-3 text-right text-[var(--ink-soft)]">{Number(s.discount_percent)}%</td>
                    <td className="px-5 py-3 text-right font-semibold">{cop(Number(s.net_amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </WholesaleLayout>
  );
}
