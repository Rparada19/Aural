import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getAdminMe, isCoordinator } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ROLE_LABEL: Record<string, string> = {
  coordinator: 'Coordinador', csr: 'Servicio al cliente', visitor_rep: 'Visitador médico',
};
const ROLE_COLOR: Record<string, string> = {
  coordinator: 'bg-primary text-white',
  csr: 'bg-success/15 text-success',
  visitor_rep: 'bg-warning/15 text-warning',
};

export default async function StaffPage() {
  const me = await getAdminMe();
  if (!me) redirect('/login');
  if (!isCoordinator(me)) redirect('/');

  const supabase = await createSupabaseServerClient();
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, email, admin_role, linked_visitor_id, created_at, visitor:linked_visitor_id(name)')
    .not('admin_role', 'is', null)
    .order('created_at', { ascending: false });

  return (
    <DashboardLayout userName={me.full_name} role={me.admin_role} isAdmin={me.is_admin}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Equipo Aural</h1>
          <p className="text-secondary mt-1">Coordinadores, CSR y visitadores con acceso al sistema.</p>
        </div>
        <Link href="/staff/new" className="px-4 h-11 rounded-md bg-primary text-white font-semibold inline-flex items-center hover:bg-primary-soft">
          + Nuevo miembro
        </Link>
      </div>

      <div className="bg-white border border-border rounded-2xl overflow-hidden mt-8">
        <table className="w-full text-sm">
          <thead className="bg-surface text-secondary text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-6 py-3">Nombre</th>
              <th className="text-left px-6 py-3">Correo</th>
              <th className="text-left px-6 py-3">Rol</th>
              <th className="text-left px-6 py-3">Visitador vinculado</th>
              <th className="text-left px-6 py-3">Creado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(staff ?? []).map((s: any) => (
              <tr key={s.id} className="hover:bg-surface/60">
                <td className="px-6 py-4 font-medium text-primary">{s.full_name}</td>
                <td className="px-6 py-4">{s.email}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${ROLE_COLOR[s.admin_role] ?? 'bg-border'}`}>
                    {ROLE_LABEL[s.admin_role] ?? s.admin_role}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs">{s.visitor?.name ?? '—'}</td>
                <td className="px-6 py-4 text-xs">{new Date(s.created_at).toLocaleDateString('es-CO')}</td>
              </tr>
            ))}
            {(staff ?? []).length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-secondary">Sin miembros. Crea el primero.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
