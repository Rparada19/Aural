import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { NewSaleForm } from '@/components/wholesale/NewSaleForm';
import { EmptyState } from '@/components/wholesale/MetricCard';
import { requireWholesaleMe } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

export default async function NewWholesaleSalePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  // La RLS ya limita al comercial a su propia cartera.
  const [{ data: clients }, { data: styles }, { data: platforms }, { data: techLevels }, { data: usedCampaigns }] = await Promise.all([
    supabase
      .from('wholesale_clients')
      .select('id, name')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('wholesale_product_styles')
      .select('slug, label, description')
      .eq('is_active', true)
      .order('sort_order'),
    supabase.from('wholesale_platforms').select('slug, label').eq('is_active', true).order('sort_order'),
    supabase.from('wholesale_tech_levels').select('slug, label').eq('is_active', true).order('sort_order'),
    supabase
      .from('wholesale_sales')
      .select('campaign_name')
      .not('campaign_name', 'is', null)
      .is('deleted_at', null)
      .limit(500),
  ]);

  const clientList = clients ?? [];
  const campaigns = [...new Set((usedCampaigns ?? []).map((c) => c.campaign_name as string))].sort();

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8">
        <Link href="/wholesale/sales" className="text-secondary text-sm hover:underline">
          ← Ventas
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Registrar venta</h1>
        <p className="text-secondary text-sm mt-1">Una factura por venta, con su descuento y detalle.</p>
      </header>

      {clientList.length === 0 ? (
        <EmptyState
          emoji="🏥"
          title="No tienes clientes asignados"
          description="Para registrar una venta primero necesitas un cliente en tu cartera. Habla con coordinación."
        />
      ) : (
        <NewSaleForm
          clients={clientList}
          styles={styles ?? []}
          platforms={platforms ?? []}
          techLevels={techLevels ?? []}
          campaigns={campaigns}
          defaultClientId={client}
        />
      )}
    </WholesaleLayout>
  );
}
