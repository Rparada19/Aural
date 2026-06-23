import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ROLES, OTORRINO_SPECIALTIES } from '@aural/shared';
import { getAdminMe, hasAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface SearchParams {
  q?: string;
  role?: string;
  status?: string;
  city?: string;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const me = await getAdminMe();
  if (!hasAccess(me)) redirect('/login');

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, cedula, city, profession, role, specialty, status, is_admin, created_at')
    .order('created_at', { ascending: false });

  if (me?.admin_role === 'visitor_rep' && me.linked_visitor_id) {
    query = query.eq('visitor_id', me.linked_visitor_id);
  }

  if (sp.q) {
    const term = `%${sp.q}%`;
    query = query.or(`full_name.ilike.${term},email.ilike.${term},cedula.ilike.${term}`);
  }
  if (sp.role) query = query.eq('role', sp.role);
  if (sp.status) query = query.eq('status', sp.status);
  if (sp.city) query = query.ilike('city', `%${sp.city}%`);

  const { data: users } = await query.limit(200);

  return (
    <DashboardLayout userName={me!.full_name} role={me!.admin_role} isAdmin={me!.is_admin}>
      <h1 className="text-3xl font-bold text-primary">Profesionales</h1>
      <p className="text-secondary mt-1">Accede al CRM de cada profesional.</p>

      <form className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Buscar (nombre, correo, cédula)"
          className="md:col-span-2 h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        />
        <select
          name="role"
          defaultValue={sp.role ?? ''}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm"
        >
          <option value="">Todos los perfiles</option>
          {ROLES.map((r) => (
            <option key={r.slug} value={r.slug}>{r.label}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
          <option value="suspended">Suspendido</option>
        </select>
        <input
          name="city"
          defaultValue={sp.city ?? ''}
          placeholder="Ciudad"
          className="h-10 rounded-md border border-border bg-white px-3 text-sm"
        />
        <button className="md:col-span-5 h-10 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-soft">
          Filtrar
        </button>
      </form>

      <div className="bg-white border border-border rounded-2xl overflow-hidden mt-6">
        <table className="w-full text-sm">
          <thead className="bg-surface text-secondary text-xs uppercase tracking-wider">
            <tr>
              <Th>Nombre</Th>
              <Th>Correo</Th>
              <Th>Ciudad</Th>
              <Th>Perfil</Th>
              <Th>Estado</Th>
              <Th>Fecha</Th>
              <Th className="text-right pr-6">CRM</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(users ?? []).map((u) => {
              const roleLabel = ROLES.find((r) => r.slug === u.role)?.label ?? u.role;
              const specialty = u.specialty
                ? OTORRINO_SPECIALTIES.find((s) => s.slug === u.specialty)?.label
                : null;
              return (
                <tr key={u.id} className="hover:bg-surface/60">
                  <Td className="font-medium text-primary">
                    {u.full_name}
                    {u.is_admin && <span className="ml-2 text-[10px] uppercase tracking-wider bg-primary text-white rounded px-1.5 py-0.5">ADMIN</span>}
                  </Td>
                  <Td>{u.email}</Td>
                  <Td>{u.city}</Td>
                  <Td>
                    {roleLabel}
                    {specialty && <span className="text-secondary"> · {specialty}</span>}
                  </Td>
                  <Td><StatusBadge status={u.status} /></Td>
                  <Td>{new Date(u.created_at).toLocaleDateString('es-CO')}</Td>
                  <Td className="text-right pr-6">
                    <Link
                      href={`/users/${u.id}`}
                      className="text-primary text-xs font-semibold hover:underline"
                    >
                      Abrir →
                    </Link>
                  </Td>
                </tr>
              );
            })}
            {(users ?? []).length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-secondary">Sin resultados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-semibold px-6 py-3 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-4 text-foreground ${className}`}>{children}</td>;
}
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { c: string; l: string }> = {
    pending: { c: 'bg-warning/15 text-warning', l: 'Pendiente' },
    approved: { c: 'bg-success/15 text-success', l: 'Aprobado' },
    rejected: { c: 'bg-danger/15 text-danger', l: 'Rechazado' },
    suspended: { c: 'bg-secondary/15 text-secondary', l: 'Suspendido' },
  };
  const s = map[status] ?? { c: 'bg-border text-foreground', l: status };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${s.c}`}>{s.l}</span>;
}
