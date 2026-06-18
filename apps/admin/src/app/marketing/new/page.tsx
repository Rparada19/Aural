import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NewCampaignForm } from '@/components/NewCampaignForm';
import { ROLES } from '@aural/shared';

export const dynamic = 'force-dynamic';

export default async function NewMarketingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const [{ data: cities }, { data: visitors }] = await Promise.all([
    supabase.from('cities').select('id, name').eq('is_active', true).order('name'),
    supabase.from('visitors').select('id, name').eq('is_active', true).order('name'),
  ]);

  return (
    <DashboardLayout userName={me.full_name}>
      <Link href="/marketing" className="text-sm text-secondary hover:text-primary">← Marketing</Link>
      <h1 className="text-3xl font-bold text-primary mt-4">Nueva campaña</h1>
      <div className="bg-white border border-border rounded-2xl p-6 mt-6 max-w-2xl">
        <NewCampaignForm
          roles={ROLES.map((r) => ({ slug: r.slug, label: r.label }))}
          cities={(cities ?? []).map((c) => c.name)}
          visitors={(visitors ?? []).map((v) => ({ id: v.id, name: v.name }))}
        />
      </div>
    </DashboardLayout>
  );
}
