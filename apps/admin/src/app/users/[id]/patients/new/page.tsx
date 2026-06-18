import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NewPatientForm } from '@/components/NewPatientForm';

export const dynamic = 'force-dynamic';

export default async function NewPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const { data: pro } = await supabase
    .from('profiles').select('id, full_name').eq('id', id).single();
  if (!pro) notFound();

  const { data: cities } = await supabase
    .from('cities').select('id, name').eq('is_active', true).order('name');

  return (
    <DashboardLayout userName={me.full_name}>
      <Link href={`/users/${id}`} className="text-sm text-secondary hover:text-primary">
        ← {pro.full_name}
      </Link>
      <h1 className="text-3xl font-bold text-primary mt-4">Nuevo paciente</h1>
      <p className="text-secondary mt-1">Para {pro.full_name}. Origen: Visita médica.</p>

      <div className="bg-white border border-border rounded-2xl p-6 mt-6 max-w-2xl">
        <NewPatientForm professionalId={id} cities={cities ?? []} />
      </div>
    </DashboardLayout>
  );
}
