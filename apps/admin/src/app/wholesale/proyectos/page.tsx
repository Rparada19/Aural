import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { EmptyState, Meter } from '@/components/wholesale/MetricCard';
import { requireWholesaleMe, cop } from '@/lib/wholesale';
import { NewTeamProject } from '@/components/wholesale/NewTeamProject';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  evento: 'Evento', campana: 'Campaña', capacitacion: 'Capacitación', otro: 'Proyecto',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Por empezar', in_progress: 'En curso', done: 'Cerrado', dropped: 'Descartado',
};

export default async function ProjectsPage() {
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  const [{ data: projects }, { data: reps }, { data: clients }, { data: notes }] = await Promise.all([
    supabase
      .from('wholesale_projects')
      .select('id, rep_id, client_id, title, kind, starts_on, ends_on, budget_amount, progress_percent, status')
      .is('deleted_at', null)
      .order('starts_on', { ascending: false }),
    supabase.from('wholesale_reps').select('id, name, zone').is('deleted_at', null).eq('is_active', true).order('name'),
    supabase.from('wholesale_clients').select('id, name').is('deleted_at', null).eq('is_active', true).order('name'),
    supabase.from('wholesale_project_notes').select('project_id, created_at').is('deleted_at', null),
  ]);

  const { data: team } = await supabase
    .from('wholesale_project_reps')
    .select('project_id, rep_id');

  const repName = new Map((reps ?? []).map((r) => [r.id, r.name]));
  const teamByProject = new Map<string, string[]>();
  for (const t of team ?? []) {
    if (!teamByProject.has(t.project_id)) teamByProject.set(t.project_id, []);
    teamByProject.get(t.project_id)!.push(t.rep_id);
  }
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));

  const activity = new Map<string, { count: number; last: string }>();
  for (const n of notes ?? []) {
    const prev = activity.get(n.project_id);
    activity.set(n.project_id, {
      count: (prev?.count ?? 0) + 1,
      last: !prev || n.created_at > prev.last ? n.created_at : prev.last,
    });
  }

  const rows = (projects ?? []).sort((a, b) => {
    // Los que tienen conversación reciente pesan más que los quietos
    const la = activity.get(a.id)?.last ?? '';
    const lb = activity.get(b.id)?.last ?? '';
    if (la !== lb) return lb.localeCompare(la);
    return (b.starts_on ?? '').localeCompare(a.starts_on ?? '');
  });

  const open = rows.filter((p) => p.status !== 'done' && p.status !== 'dropped');
  const closed = rows.filter((p) => p.status === 'done' || p.status === 'dropped');

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline="Wholesale"
        title="Proyectos"
        subtitle="Eventos, campañas y capacitaciones que coordinación y comerciales trabajan juntos. Cada uno tiene su hilo de avances y archivos."
        actions={
          me.can.setGoals ? (
            <NewTeamProject reps={reps ?? []} clients={clients ?? []} />
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Sin proyectos todavía"
          description="Los proyectos se crean desde la ficha de cada comercial. Ahí quedan asociados a su zona y, si aplica, a un cliente."
        />
      ) : (
        <>
          <section className="wsale-panel divide-y divide-[var(--rule)]">
            {open.map((p) => {
              const act = activity.get(p.id);
              return (
                <Link key={p.id} href={`/wholesale/proyectos/${p.id}`} className="flex items-start gap-5 p-4 hover:bg-[rgba(180,85,31,0.03)] transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px]">{p.title}</p>
                    <p className="text-[11px] text-[var(--ink-faint)] mt-0.5">
                      {[
                        KIND_LABEL[p.kind] ?? 'Proyecto',
                        (teamByProject.get(p.id) ?? [p.rep_id])
                          .filter(Boolean)
                          .map((id) => repName.get(id as string))
                          .filter(Boolean)
                          .join(' + '),
                        p.client_id ? clientName.get(p.client_id) : null,
                        p.starts_on,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <div className="w-32 shrink-0 hidden sm:block pt-1">
                    <Meter value={p.progress_percent} max={100} tone={p.progress_percent >= 100 ? 'success' : 'neutral'} />
                    <p className="text-[10px] text-[var(--ink-faint)] mt-1.5">
                      {p.progress_percent}% · {STATUS_LABEL[p.status] ?? p.status}
                    </p>
                  </div>

                  <div className="w-24 shrink-0 text-right">
                    {p.budget_amount ? (
                      <p className="wsale-figure text-[13px]">{cop(Number(p.budget_amount))}</p>
                    ) : null}
                    <p className="text-[10px] text-[var(--ink-faint)] mt-0.5">
                      {act ? `${act.count} mensaje${act.count === 1 ? '' : 's'}` : 'Sin mensajes'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </section>

          {closed.length > 0 && (
            <details className="mt-6">
              <summary className="text-[13px] text-[var(--ink-soft)] cursor-pointer hover:text-[var(--ink)]">
                Cerrados y descartados ({closed.length})
              </summary>
              <section className="wsale-panel divide-y divide-[var(--rule)] mt-3">
                {closed.map((p) => (
                  <Link key={p.id} href={`/wholesale/proyectos/${p.id}`} className="flex items-center gap-4 p-3.5 hover:bg-[rgba(180,85,31,0.03)] transition">
                    <span className="flex-1 truncate text-[13px] text-[var(--ink-soft)]">{p.title}</span>
                    <span className="text-[11px] text-[var(--ink-faint)]">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </Link>
                ))}
              </section>
            </details>
          )}
        </>
      )}
    </WholesaleLayout>
  );
}
