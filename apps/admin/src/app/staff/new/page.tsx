import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NewStaffForm } from '@/components/NewStaffForm';
import { getAdminMe, isCoordinator } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function NewStaffPage() {
  const me = await getAdminMe();
  if (!me) redirect('/login');
  if (!isCoordinator(me)) redirect('/');

  const supabase = await createSupabaseServerClient();
  const { data: visitors } = await supabase
    .from('visitors').select('id, name').eq('is_active', true).order('name');

  return (
    <DashboardLayout userName={me.full_name} role={me.admin_role} isAdmin={me.is_admin}>
      <Link href="/staff" className="text-sm text-secondary hover:text-primary">← Equipo Aural</Link>
      <h1 className="text-3xl font-bold text-primary mt-4">Nuevo miembro</h1>
      <div className="bg-white border border-border rounded-2xl p-6 mt-6 max-w-2xl">
        <NewStaffForm visitors={(visitors ?? []) as { id: string; name: string }[]} />
      </div>
    </DashboardLayout>
  );
}
