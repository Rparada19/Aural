import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CatalogManager } from '@/components/CatalogManager';
import { VisitorManager } from '@/components/VisitorManager';
import { AudiologistManager } from '@/components/AudiologistManager';

export const dynamic = 'force-dynamic';

export default async function CatalogsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles')
    .select('is_admin, full_name')
    .eq('id', user.id)
    .single();
  if (!me?.is_admin) redirect('/login');

  const [techs, plats, cities, locs, origins, visitors, audios] = await Promise.all([
    supabase.from('technologies').select('*').order('sort_order'),
    supabase.from('platforms').select('*').order('sort_order'),
    supabase.from('cities').select('*').order('name'),
    supabase.from('locations').select('*, city:cities(name)').order('name'),
    supabase.from('patient_origins').select('*').order('name'),
    supabase.from('visitors').select('*').order('name'),
    supabase.from('audiologists').select('*, location:locations(name)').order('name'),
  ]);

  const locOpts = (locs.data ?? []).map((l: any) => ({ id: l.id, name: l.name }));
  const audioRows = (audios.data ?? []).map((a: any) => ({
    id: a.id, name: a.name, location_id: a.location_id, phone: a.phone, email: a.email, is_active: a.is_active,
    locationName: a.location?.name ?? null,
  }));

  return (
    <DashboardLayout userName={me.full_name}>
      <h1 className="text-3xl font-bold text-primary">Catálogos</h1>
      <p className="text-secondary mt-1">
        Administra las listas que alimentan el CRM (tecnologías, plataformas, sedes, ciudades).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <CatalogManager
          title="Tecnologías"
          field="name"
          fieldLabel="Nombre"
          table="technologies"
          rows={techs.data ?? []}
        />
        <CatalogManager
          title="Plataformas"
          field="code"
          fieldLabel="Código"
          table="platforms"
          rows={plats.data ?? []}
        />
        <CatalogManager
          title="Ciudades"
          field="name"
          fieldLabel="Nombre"
          table="cities"
          rows={cities.data ?? []}
        />
        <CatalogManager
          title="Sedes"
          field="name"
          fieldLabel="Nombre"
          table="locations"
          rows={(locs.data ?? []).map((r: any) => ({ ...r, _extra: r.city?.name ?? '—' }))}
          extraColumnLabel="Ciudad"
        />
        <CatalogManager
          title="Orígenes del paciente"
          field="name"
          fieldLabel="Nombre"
          table="patient_origins"
          rows={origins.data ?? []}
        />
        <VisitorManager rows={(visitors.data as any) ?? []} />
        <AudiologistManager rows={audioRows} locations={locOpts} />
      </div>
    </DashboardLayout>
  );
}
