import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { FUNNEL_STATUS_LABEL, type PatientFunnelStatus, ROLES, trafficLight, TRAFFIC_LIGHT_COLOR, CASE_TYPE_LABEL, type PatientCaseType } from '@aural/shared';
import { getAdminMe, hasAccess } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface SearchParams {
  q?: string;
  professional?: string;
  status?: string;
  sale?: string;
}

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const me = await getAdminMe();
  if (!hasAccess(me)) redirect('/login');

  let prosQ = supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('status', 'approved')
    .order('full_name');
  if (me?.admin_role === 'visitor_rep' && me.linked_visitor_id) {
    prosQ = prosQ.eq('visitor_id', me.linked_visitor_id);
  }
  const { data: pros } = await prosQ;

  let query = supabase
    .from('patients')
    .select('id, full_name, cedula, phone, funnel_status, sale_closed, total_price, priority, city_text, case_type, created_at, updated_at, first_contact_at, professional_id')
    .is('deleted_at', null)
    .order('priority', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (sp.q) {
    const term = `%${sp.q}%`;
    query = query.or(`full_name.ilike.${term},cedula.ilike.${term},phone.ilike.${term}`);
  }
  // Visitor_rep: solo pacientes de sus médicos
  if (me?.admin_role === 'visitor_rep' && me.linked_visitor_id) {
    const proIds = (pros ?? []).map((p) => p.id);
    if (proIds.length === 0) {
      // sin médicos → forzar vacío
      query = query.eq('professional_id', '00000000-0000-0000-0000-000000000000');
    } else {
      query = query.in('professional_id', proIds);
    }
  }
  if (sp.professional) query = query.eq('professional_id', sp.professional);
  if (sp.status) query = query.eq('funnel_status', sp.status);
  if (sp.sale === 'closed') query = query.eq('sale_closed', true);
  if (sp.sale === 'open') query = query.eq('sale_closed', false);

  const { data: list } = await query.limit(200);
  const proMap = new Map((pros ?? []).map((p) => [p.id, p.full_name]));

  return (
    <DashboardLayout userName={me!.full_name} role={me!.admin_role} isAdmin={me!.is_admin}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Pacientes</h1>
          <p className="text-secondary mt-1">CRM general. Asigna cada paciente a un profesional.</p>
        </div>
        <Link
          href="/patients/new"
          className="px-4 h-11 rounded-md bg-primary text-white font-semibold inline-flex items-center hover:bg-primary-soft"
        >
          + Nuevo paciente
        </Link>
      </div>

      <form className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Buscar (nombre, cédula, teléfono)"
          className="md:col-span-2 h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        />
        <select
          name="professional"
          defaultValue={sp.professional ?? ''}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm"
        >
          <option value="">Todos los profesionales</option>
          {(pros ?? []).map((p) => {
            const role = ROLES.find((r) => r.slug === p.role)?.label;
            return <option key={p.id} value={p.id}>{p.full_name}{role ? ` · ${role}` : ''}</option>;
          })}
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(FUNNEL_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          name="sale"
          defaultValue={sp.sale ?? ''}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm"
        >
          <option value="">Venta: todas</option>
          <option value="closed">Solo cerradas</option>
          <option value="open">Solo abiertas</option>
        </select>
        <button className="md:col-span-5 h-10 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-soft">
          Filtrar
        </button>
      </form>

      <div className="bg-white border border-border rounded-2xl overflow-x-auto mt-6">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-surface text-secondary text-xs uppercase tracking-wider">
            <tr>
              <Th>Nombre</Th>
              <Th>Cédula</Th>
              <Th>Profesional</Th>
              <Th>Tipo de caso</Th>
              <Th>Estado</Th>
              <Th>Cotizado</Th>
              <Th>Valor total</Th>
              <Th>Creado</Th>
              <Th className="text-right pr-6">Ficha</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(list ?? []).map((p) => (
              <tr key={p.id} className="hover:bg-surface/60">
                <Td className="font-medium text-primary">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
                    style={{ backgroundColor: TRAFFIC_LIGHT_COLOR[trafficLight(p.updated_at ?? p.first_contact_at)] }}
                  />
                  {p.full_name}
                  {p.priority === 'alta' && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider bg-danger text-white px-1.5 py-0.5 rounded font-semibold">URGENTE</span>
                  )}
                  {p.priority === 'media' && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider bg-warning/15 text-warning px-1.5 py-0.5 rounded font-semibold">MEDIA</span>
                  )}
                  {p.priority && p.funnel_status !== 'registered' && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider bg-success/15 text-success px-1.5 py-0.5 rounded font-semibold">GESTIONADO</span>
                  )}
                </Td>
                <Td>{p.cedula ?? '—'}</Td>
                <Td>{proMap.get(p.professional_id) ?? '—'}</Td>
                <Td>
                  <CaseBadge type={p.case_type as PatientCaseType} />
                </Td>
                <Td>{FUNNEL_STATUS_LABEL[p.funnel_status as PatientFunnelStatus]}</Td>
                <Td>
                  {p.total_price && Number(p.total_price) > 0 ? (
                    <span className="text-xs font-semibold bg-warning/15 text-warning px-2 py-0.5 rounded">Sí</span>
                  ) : (
                    <span className="text-xs text-secondary">No</span>
                  )}
                </Td>
                <Td>{p.total_price ? cop(Number(p.total_price)) : '—'}</Td>
                <Td>{new Date(p.created_at).toLocaleDateString('es-CO')}</Td>
                <Td className="text-right pr-6">
                  <Link
                    href={`/users/${p.professional_id}/patients/${p.id}`}
                    className="text-primary text-xs font-semibold hover:underline"
                  >
                    Abrir →
                  </Link>
                </Td>
              </tr>
            ))}
            {(list ?? []).length === 0 && (
              <tr><td colSpan={9} className="text-center py-8 text-secondary">Sin pacientes.</td></tr>
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
function CaseBadge({ type }: { type: PatientCaseType }) {
  const t = type ?? 'sale_candidate';
  const map: Record<PatientCaseType, string> = {
    pending_evaluation: 'bg-border text-foreground',
    sale_candidate: 'bg-warning/15 text-warning',
    normal_hearing: 'bg-success/15 text-success',
    sudden_hearing_loss: 'bg-danger/15 text-danger',
    cerumen_removal: 'bg-secondary/15 text-secondary',
    other_non_sale: 'bg-border text-foreground',
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded ${map[t]}`}>{CASE_TYPE_LABEL[t]}</span>;
}
