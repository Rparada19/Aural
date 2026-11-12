import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { MetricCard, EmptyState } from '@/components/wholesale/MetricCard';
import { NewCase } from '@/components/wholesale/cases/CaseForms';
import { requireWholesaleMe } from '@/lib/wholesale';
import { CASE_KIND, CASE_STATUS, OPEN_STATUS } from '@/lib/cases';
import { today } from '@/lib/crm';

export const dynamic = 'force-dynamic';

const VIEWS = [
  { key: 'mios', label: 'Mis casos' },
  { key: 'abiertos', label: 'Todos los abiertos' },
  { key: 'sin', label: 'Sin responsable' },
  { key: 'vencidos', label: 'Vencidos' },
  { key: 'cerrados', label: 'Resueltos y cerrados' },
];

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ v?: string; tipo?: string }> }) {
  const sp = await searchParams;
  const me = await requireWholesaleMe('casos');
  const supabase = await createSupabaseServerClient();
  const t = today();
  const month = t.slice(0, 7);

  const [{ data: cases }, { data: clients }] = await Promise.all([
    supabase.from('wholesale_cases')
      .select('id, number, client_id, kind, priority, status, subject, due_on, assigned_to, assigned_name, created_at, resolved_at, updated_at')
      .is('deleted_at', null).order('created_at', { ascending: false }).limit(500),
    supabase.from('wholesale_clients').select('id, name').is('deleted_at', null).order('name'),
  ]);

  const all = cases ?? [];
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const open = all.filter((c) => OPEN_STATUS.includes(c.status));
  const late = open.filter((c) => c.due_on && c.due_on < t);
  const mine = open.filter((c) => c.assigned_to === me.id);
  const resolvedMonth = all.filter((c) => c.resolved_at && c.resolved_at.slice(0, 7) === month);
  const avgDays = resolvedMonth.length
    ? resolvedMonth.reduce((a, c) => a + (Date.parse(c.resolved_at!) - Date.parse(c.created_at)) / 86_400_000, 0) / resolvedMonth.length
    : null;

  const defaultView = me.role === 'assistant' && mine.length ? 'mios' : 'abiertos';
  const view = sp.v ?? defaultView;
  let rows =
    view === 'mios' ? mine
    : view === 'sin' ? open.filter((c) => !c.assigned_to)
    : view === 'vencidos' ? late
    : view === 'cerrados' ? all.filter((c) => !OPEN_STATUS.includes(c.status))
    : open;
  if (sp.tipo) rows = rows.filter((c) => c.kind === sp.tipo);
  const rank = { alta: 0, media: 1, baja: 2 } as Record<string, number>;
  if (view !== 'cerrados') {
    rows = [...rows].sort((a, b) =>
      Number(!!b.due_on && b.due_on < t) - Number(!!a.due_on && a.due_on < t)
      || rank[a.priority] - rank[b.priority]
      || (a.due_on ?? '9999').localeCompare(b.due_on ?? '9999'));
  }

  const href = (v: string, tipo?: string) => `/wholesale/casos?v=${v}${tipo ? `&tipo=${tipo}` : ''}`;

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline="Wholesale · Servicio al cliente"
        title="Casos de servicio"
        subtitle="Reparaciones, garantías, soporte, pedidos y despachos de los centros. Primero lo vencido y lo urgente."
        actions={<NewCase clients={clients ?? []} />}
      />

      <section className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-6">
        <MetricCard label="Abiertos" value={String(open.length)} />
        <MetricCard label="A mi cargo" value={String(mine.length)} />
        <MetricCard label="Vencidos" value={String(late.length)} tone={late.length ? 'alert' : 'success'} />
        <MetricCard label="Resueltos este mes" value={String(resolvedMonth.length)} />
        <MetricCard label="Días promedio para resolver" value={avgDays === null ? '—' : avgDays.toFixed(1)} hint="Casos resueltos este mes" />
      </section>

      <div className="flex flex-wrap gap-2 mb-3">
        {VIEWS.map((v) => <Link key={v.key} href={href(v.key, sp.tipo)} className="wsale-chip" data-on={view === v.key}>{v.label}</Link>)}
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        <Link href={href(view)} className="wsale-chip" data-on={!sp.tipo}>Todos los tipos</Link>
        {Object.entries(CASE_KIND).map(([k, v]) => <Link key={k} href={href(view, k)} className="wsale-chip" data-on={sp.tipo === k}>{v.label}</Link>)}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={view === 'mios' ? 'No tienes casos a tu cargo' : 'Nada por aquí'}
          description="Cuando un centro llame o escriba pidiendo algo, crea el caso con el botón Nuevo caso. Así nada se pierde y todos ven en qué va."
        />
      ) : (
        <section className="wsale-panel overflow-x-auto">
          <table className="wsale-table">
            <thead>
              <tr><th>#</th><th>Cliente</th><th>Qué necesita</th><th>Tipo</th><th>Estado</th><th>Responsable</th><th>Vence</th></tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const isLate = OPEN_STATUS.includes(c.status) && c.due_on && c.due_on < t;
                return (
                  <tr key={c.id}>
                    <td className="wsale-mono text-[var(--ink-faint)]">{c.number}</td>
                    <td>{clientName.get(c.client_id) ?? '—'}</td>
                    <td>
                      <Link href={`/wholesale/casos/${c.id}`} className="hover:text-[var(--accent)]">
                        {c.priority === 'alta' && <span className="wsale-bad font-semibold">Urgente · </span>}{c.subject}
                      </Link>
                    </td>
                    <td className="text-[var(--ink-soft)]">{CASE_KIND[c.kind]?.label}</td>
                    <td>{CASE_STATUS[c.status]}</td>
                    <td className={c.assigned_name ? '' : 'wsale-warn'}>{c.assigned_name ?? 'Sin responsable'}</td>
                    <td className={isLate ? 'wsale-bad' : ''}>{c.due_on ?? '—'}{isLate ? ' · vencido' : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
      <p className="text-[11px] text-[var(--ink-faint)] mt-3">Tiempos de respuesta: {Object.values(CASE_KIND).map((k) => `${k.label} ${k.days} d`).join(' · ')}. Los urgentes, máximo 2 días.</p>
    </WholesaleLayout>
  );
}
