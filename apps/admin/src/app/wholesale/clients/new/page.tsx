import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { NewClientForm } from '@/components/wholesale/NewClientForm';
import { requireWholesaleMe } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

export default async function NewWholesaleClientPage() {
  const me = await requireWholesaleMe();
  if (me.role !== 'coordinator') redirect('/wholesale/clients');

  const supabase = await createSupabaseServerClient();
  const { data: reps } = await supabase
    .from('wholesale_reps')
    .select('id, name, zone')
    .eq('is_active', true)
    .order('name');

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8">
        <Link href="/wholesale/clients" className="text-secondary text-sm hover:underline">
          ← Clientes
        </Link>
        <h1 className="text-2xl font-semibold mt-2">Nuevo cliente</h1>
        <p className="text-secondary text-sm mt-1">
          Un centro auditivo del canal mayorista, con su comercial de zona.
        </p>
      </header>
      <NewClientForm reps={reps ?? []} />
    </WholesaleLayout>
  );
}
