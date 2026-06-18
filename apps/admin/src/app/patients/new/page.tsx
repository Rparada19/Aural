import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NewPatientFormGlobal } from '@/components/NewPatientFormGlobal';
import { ROLES, OTORRINO_SPECIALTIES } from '@aural/shared';

export const dynamic = 'force-dynamic';

export default async function NewPatientGlobalPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const [{ data: pros }, { data: cities }, { data: visitors }, { data: locations }, { data: audiologists }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, role, specialty, city')
      .eq('status', 'approved')
      .order('full_name'),
    supabase.from('cities').select('id, name').eq('is_active', true).order('name'),
    supabase.from('visitors').select('id, name, city').eq('is_active', true).order('name'),
    supabase.from('locations').select('id, name, city:cities(name)').eq('is_active', true).order('name'),
    supabase.from('audiologists').select('id, name, location_id').eq('is_active', true).order('name'),
  ]);

  const proOptions = (pros ?? []).map((p) => {
    const role = ROLES.find((r) => r.slug === p.role)?.label ?? p.role;
    const spec = p.specialty ? OTORRINO_SPECIALTIES.find((s) => s.slug === p.specialty)?.label : null;
    const label = `${p.full_name} · ${role}${spec ? ' · ' + spec : ''}${p.city ? ' · ' + p.city : ''}`;
    return { id: p.id, label };
  });

  return (
    <DashboardLayout userName={me.full_name}>
      <Link href="/patients" className="text-sm text-secondary hover:text-primary">← Pacientes</Link>
      <h1 className="text-3xl font-bold text-primary mt-4">Nuevo paciente</h1>
      <p className="text-secondary mt-1">Asigna el paciente a un profesional aprobado.</p>

      <div className="bg-white border border-border rounded-2xl p-6 mt-6 max-w-2xl">
        <NewPatientFormGlobal
          professionals={proOptions}
          cities={cities ?? []}
          visitors={(visitors ?? []).map((v: any) => ({ id: v.id, label: v.city ? `${v.name} · ${v.city}` : v.name }))}
          locations={(locations ?? []).map((l: any) => ({ id: l.id, label: l.city?.name ? `${l.name} · ${l.city.name}` : l.name }))}
          audiologists={(audiologists ?? []).map((a: any) => ({ id: a.id, name: a.name, locationId: a.location_id }))}
        />
      </div>
    </DashboardLayout>
  );
}
