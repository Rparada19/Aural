import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NewContentForm } from '@/components/NewContentForm';
import { ROLES } from '@aural/shared';

export const dynamic = 'force-dynamic';

export default async function NewNewsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  return (
    <DashboardLayout userName={me.full_name}>
      <Link href="/news" className="text-sm text-secondary hover:text-primary">← Noticias</Link>
      <h1 className="text-3xl font-bold text-primary mt-4">Nueva publicación</h1>
      <div className="bg-white border border-border rounded-2xl p-6 mt-6 max-w-3xl">
        <NewContentForm roles={ROLES.map((r) => ({ slug: r.slug, label: r.label }))} />
      </div>
    </DashboardLayout>
  );
}
