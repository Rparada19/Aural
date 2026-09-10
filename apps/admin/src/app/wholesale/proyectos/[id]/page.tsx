import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { Meter } from '@/components/wholesale/MetricCard';
import { ProjectThread, type Note } from '@/components/wholesale/ProjectThread';
import { requireWholesaleMe, cop } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  evento: 'Evento', campana: 'Campaña', capacitacion: 'Capacitación', otro: 'Proyecto',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Por empezar', in_progress: 'En curso', done: 'Cerrado', dropped: 'Descartado',
};

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  const [{ data: project }, { data: notes }, { data: reps }, { data: clients }] = await Promise.all([
    supabase
      .from('wholesale_projects')
      .select('id, rep_id, client_id, title, kind, description, starts_on, ends_on, budget_amount, progress_percent, status')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('wholesale_project_notes')
      .select('id, author_name, author_role, body, file_path, file_name, file_size, progress_percent, created_at')
      .eq('project_id', id)
      .is('deleted_at', null)
      .order('created_at'),
    supabase.from('wholesale_reps').select('id, name, zone').is('deleted_at', null),
    supabase.from('wholesale_clients').select('id, name').is('deleted_at', null),
  ]);

  const { data: team } = await supabase
    .from('wholesale_project_reps')
    .select('rep_id')
    .eq('project_id', id);

  if (!project) notFound();

  const teamIds = (team ?? []).map((t) => t.rep_id);
  const teamReps = (reps ?? []).filter((r) => teamIds.includes(r.id));
  const repName = (reps ?? []).find((r) => r.id === project.rep_id)?.name;
  const clientName = (clients ?? []).find((c) => c.id === project.client_id)?.name;

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline={KIND_LABEL[project.kind] ?? 'Proyecto'}
        title={project.title}
        subtitle={[teamReps.map((r) => r.name).join(' + ') || repName, clientName, project.starts_on && project.ends_on
          ? `${project.starts_on} → ${project.ends_on}`
          : project.starts_on].filter(Boolean).join(' · ')}
        actions={<Link href="/wholesale/proyectos" className="wsale-btn-ghost">Todos los proyectos</Link>}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_260px] items-start">
        <section className="wsale-panel p-6">
          <h2 className="wsale-display text-[17px] pb-3 border-b border-[var(--rule)] mb-5">
            Conversación
          </h2>
          <ProjectThread
            projectId={project.id}
            notes={(notes ?? []) as Note[]}
            progress={project.progress_percent}
            myRole={me.role}
          />
        </section>

        <aside className="wsale-panel p-5">
          <p className="wsale-overline">Estado</p>
          <p className="wsale-figure text-[26px] mt-2 leading-none">{project.progress_percent}%</p>
          <div className="mt-3">
            <Meter
              value={project.progress_percent}
              max={100}
              tone={project.progress_percent >= 100 ? 'success' : 'neutral'}
            />
          </div>
          <p className="text-[12px] text-[var(--ink-soft)] mt-2">
            {STATUS_LABEL[project.status] ?? project.status}
          </p>

          <dl className="mt-5 pt-4 border-t border-[var(--rule)] space-y-3 text-[12px]">
            {project.budget_amount && (
              <div>
                <dt className="wsale-overline">Inversión estimada</dt>
                <dd className="wsale-figure text-[14px] mt-1">{cop(Number(project.budget_amount))}</dd>
              </div>
            )}
            {teamReps.length > 0 && (
              <div>
                <dt className="wsale-overline">
                  {teamReps.length === 1 ? 'Comercial' : 'Equipo'}
                </dt>
                <dd className="mt-1 space-y-1">
                  {teamReps.map((r, i) => (
                    <div key={r.id}>
                      <Link href={`/wholesale/reps/${r.id}`} className="hover:text-[var(--accent)] transition">
                        {r.name}
                      </Link>
                      {i === 0 && teamReps.length > 1 && (
                        <span className="text-[10px] text-[var(--ink-faint)]"> · responsable</span>
                      )}
                    </div>
                  ))}
                </dd>
              </div>
            )}
            {clientName && (
              <div>
                <dt className="wsale-overline">Cliente</dt>
                <dd className="mt-1">
                  <Link href={`/wholesale/clients/${project.client_id}`} className="hover:text-[var(--accent)] transition">
                    {clientName}
                  </Link>
                </dd>
              </div>
            )}
          </dl>

          {project.description && (
            <p className="text-[12px] text-[var(--ink-soft)] mt-5 pt-4 border-t border-[var(--rule)] leading-relaxed">
              {project.description}
            </p>
          )}
        </aside>
      </div>
    </WholesaleLayout>
  );
}
