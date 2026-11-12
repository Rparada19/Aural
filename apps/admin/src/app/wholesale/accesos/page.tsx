import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { PeopleList, GrantAccess, type Person } from '@/components/wholesale/access/AccessPanels';
import { requireWholesaleMe } from '@/lib/wholesale';
import { serviceClient } from '@/lib/supabase/service';
import { serviceTeam } from '@/lib/servicio';
import { MODULES, DEFAULT_MODULES, type WholesaleRole } from '@/lib/wholesale-roles';

export const dynamic = 'force-dynamic';

const ROLE_OF: Record<string, WholesaleRole> = {
  wholesale_rep: 'rep', wholesale_assistant: 'assistant', wholesale_coordinator: 'coordinator',
};
const COLS: { role: WholesaleRole; label: string; who: string }[] = [
  { role: 'rep', label: 'Comercial', who: 'Especialistas de producto' },
  { role: 'assistant', label: 'Servicio al cliente', who: 'SAC audiológico' },
  { role: 'coordinator', label: 'Coordinación', who: 'Margarita y Rafael' },
];
const SCOPE: Partial<Record<string, Partial<Record<WholesaleRole, string>>>> = {
  clientes: { rep: 'Solo su cartera', assistant: 'Todos, solo lectura' },
  casos: { rep: 'Los de su cartera' },
  oportunidades: { rep: 'Las suyas' },
  ventas: { rep: 'Las suyas' },
  presupuestos: { rep: 'Los suyos' },
};

export default async function AccessPage() {
  const me = await requireWholesaleMe('accesos');
  const svc = serviceClient();

  const [{ data: profiles }, { data: reps }, users, team] = await Promise.all([
    svc.from('profiles')
      .select('id, full_name, email, is_admin, admin_role, linked_wholesale_rep_id, wholesale_blocked, wholesale_modules')
      .or('admin_role.in.(wholesale_rep,wholesale_assistant,wholesale_coordinator),is_admin.eq.true')
      .is('deleted_at', null),
    svc.from('wholesale_reps').select('id, name').is('deleted_at', null),
    svc.auth.admin.listUsers({ perPage: 1000 }).then((r) => r.data?.users ?? []).catch(() => []),
    serviceTeam(),
  ]);

  const lastSeen = new Map(users.map((u) => [u.id, u.last_sign_in_at ?? null]));
  const repName = new Map((reps ?? []).map((r) => [r.id, r.name]));
  const people: Person[] = (profiles ?? []).map((p) => ({
    id: p.id, name: p.full_name, email: String(p.email ?? ''),
    role: p.is_admin ? 'admin' : ROLE_OF[p.admin_role as string],
    blocked: Boolean(p.wholesale_blocked), modules: p.wholesale_modules ?? null,
    repName: p.linked_wholesale_rep_id ? repName.get(p.linked_wholesale_rep_id) ?? null : null,
    lastSeen: lastSeen.get(p.id) ?? null, locked: Boolean(p.is_admin) || p.id === me.id,
  }));
  const order: Record<string, number> = { admin: 0, coordinator: 1, assistant: 2, rep: 3 };
  people.sort((a, b) => order[a.role] - order[b.role] || a.name.localeCompare(b.name));

  const known = new Set(people.map((p) => p.email.toLowerCase()));
  const suggestions = team.ok
    ? team.team
        .filter((t) => !known.has(t.email.toLowerCase()) && ['wholesale', 'audiologico'].includes(t.area))
        .map((t) => ({
          name: t.name, email: t.email,
          role: t.area === 'wholesale' ? 'wholesale_rep' : 'wholesale_assistant',
          area: t.area === 'wholesale' ? 'Comercial' : 'Servicio al cliente',
        }))
    : [];

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline="Wholesale · Administración"
        title="Accesos"
        subtitle="Quién entra al portal, con qué perfil y qué secciones ve. Un usuario bloqueado no puede entrar hasta que lo desbloquees; su información se conserva."
      />

      <section className="wsale-panel p-5 mb-8">
        <p className="wsale-overline mb-4">Dar acceso a una persona</p>
        <GrantAccess isAdmin={me.role === 'admin'} suggestions={suggestions} />
        <p className="text-[11px] text-[var(--ink-faint)] mt-3">Le llega un correo para crear su clave. Entra por wholesale.auralbusinessintelligence.com.</p>
      </section>

      <section className="wsale-panel px-5 mb-8">
        <p className="wsale-overline pt-5">Personas con acceso · {people.length}</p>
        <PeopleList people={people} isAdmin={me.role === 'admin'} />
      </section>

      <section className="wsale-panel overflow-x-auto">
        <p className="wsale-overline p-5 pb-0">Qué ve cada perfil</p>
        <table className="wsale-table">
          <thead>
            <tr>
              <th>Sección</th>
              {COLS.map((c) => <th key={c.role} className="text-center">{c.label}<span className="block font-normal normal-case tracking-normal text-[10px]">{c.who}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => (
              <tr key={m.key}>
                <td>{m.label}<span className="block text-[11px] text-[var(--ink-faint)]">{m.hint}</span></td>
                {COLS.map((c) => {
                  const on = DEFAULT_MODULES[c.role].includes(m.key);
                  return (
                    <td key={c.role} className="text-center">
                      {on ? <span className="wsale-good">✓</span> : <span className="text-[var(--ink-faint)]">—</span>}
                      {on && SCOPE[m.key]?.[c.role] && <span className="block text-[10px] text-[var(--ink-faint)]">{SCOPE[m.key]?.[c.role]}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-[var(--ink-faint)] p-5 pt-3">Con el botón “Qué ve” puedes darle o quitarle secciones a una persona puntual. Comerciales, Equipo y servicio, y Accesos son solo de coordinación.</p>
      </section>
    </WholesaleLayout>
  );
}
