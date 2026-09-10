import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { MetricCard } from '@/components/wholesale/MetricCard';
import { ProgressCard, type GoalStatus } from '@/components/wholesale/ProgressCard';
import { NewGoalForm, NewProjectForm } from '@/components/wholesale/NewGoalForm';
import { WeekAgenda, type Activity } from '@/components/wholesale/WeekAgenda';
import { ActivityTargets } from '@/components/wholesale/ActivityTargets';
import { ACTIVITY_KINDS, mondayOf, addDays, type ActivityKind } from '@/lib/activities';
import { requireWholesaleMe, salesMetrics, cop, pct } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const KIND_LABEL: Record<string, string> = {
  evento: 'Evento',
  campana: 'Campaña',
  capacitacion: 'Capacitación',
  otro: 'Proyecto',
};

export default async function WholesaleRepDetail({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; month?: string; week?: string }>;
}) {
  const { id } = await params;
  const { year: yearParam, month: monthParam, week: weekParam } = await searchParams;
  const me = await requireWholesaleMe();

  // El comercial solo entra a su propia ficha.
  if (me.role === 'rep' && me.repId !== id) notFound();

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  const month = Number(monthParam) || now.getMonth() + 1;
  const monday = weekParam ?? mondayOf(now);
  const today = now.toISOString().slice(0, 10);
  const monthFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthTo = `${year}-${String(month).padStart(2, '0')}-31`;
  const weekFrom = monday;
  const weekTo = addDays(monday, 6);
  const supabase = await createSupabaseServerClient();

  const [{ data: rep }, { data: clients }, { data: sales }, { data: budgets }, { data: goals }, { data: projects },
         { data: weekActs }, { data: monthActs }, { data: actTargets }] =
    await Promise.all([
      supabase.from('wholesale_reps').select('id, name, zone, phone, email').eq('id', id).is('deleted_at', null).maybeSingle(),
      supabase.from('wholesale_clients').select('id, name, city').eq('rep_id', id).is('deleted_at', null).order('name'),
      supabase
        .from('wholesale_sales')
        .select('sold_on, units, binaural, rechargeable, net_amount')
        .eq('rep_id', id)
        .is('deleted_at', null)
        .gte('sold_on', `${year}-01-01`)
        .lte('sold_on', `${year}-12-31`),
      supabase.from('wholesale_budgets').select('client_id, month, amount, units').eq('year', year),
      supabase
        .from('wholesale_goals')
        .select('id, month, title, description, target_value, progress_percent, status, progress_note')
        .eq('rep_id', id)
        .eq('year', year)
        .is('deleted_at', null)
        .order('month'),
      supabase
        .from('wholesale_projects')
        .select('id, title, kind, client_id, starts_on, ends_on, budget_amount, progress_percent, status, progress_note')
        .eq('rep_id', id)
        .is('deleted_at', null)
        .order('starts_on', { ascending: false }),
      supabase
        .from('wholesale_activities')
        .select('id, kind, scheduled_on, starts_at, title, notes, status, client_id')
        .eq('rep_id', id)
        .is('deleted_at', null)
        .gte('scheduled_on', weekFrom)
        .lte('scheduled_on', weekTo),
      supabase
        .from('wholesale_activities')
        .select('kind, status')
        .eq('rep_id', id)
        .is('deleted_at', null)
        .gte('scheduled_on', monthFrom)
        .lte('scheduled_on', monthTo),
      supabase
        .from('wholesale_activity_targets')
        .select('kind, target')
        .eq('rep_id', id)
        .eq('year', year)
        .eq('month', month),
    ]);

  if (!rep) notFound();

  const clientList = clients ?? [];
  const clientIds = new Set(clientList.map((c) => c.id));
  const clientName = new Map(clientList.map((c) => [c.id, c.name]));

  const saleList = sales ?? [];
  const monthSales = saleList.filter((s) => Number(s.sold_on.slice(5, 7)) === month);
  const monthStats = salesMetrics(monthSales);
  const yearStats = salesMetrics(saleList);

  const myBudgets = (budgets ?? []).filter((b) => clientIds.has(b.client_id));
  const monthBudget = myBudgets
    .filter((b) => b.month === month)
    .reduce((acc, b) => ({ amount: acc.amount + Number(b.amount ?? 0), units: acc.units + Number(b.units ?? 0) }),
      { amount: 0, units: 0 });

  const monthGoals = (goals ?? []).filter((g) => g.month === month);
  const otherGoals = (goals ?? []).filter((g) => g.month !== month);

  const ratio = monthBudget.amount > 0 ? monthStats.revenue / monthBudget.amount : null;
  const unitRatio = monthBudget.units > 0 ? monthStats.units / monthBudget.units : null;

  const targetByKind = new Map((actTargets ?? []).map((t) => [t.kind as ActivityKind, t.target]));
  const activityRows = ACTIVITY_KINDS.map((k) => {
    const mine = (monthActs ?? []).filter((a) => a.kind === k.kind);
    return {
      kind: k.kind,
      target: targetByKind.get(k.kind) ?? 0,
      doneCount: mine.filter((a) => a.status === 'done').length,
      plannedCount: mine.filter((a) => a.status === 'planned').length,
    };
  });

  const weekLabel = (() => {
    const end = addDays(monday, 6);
    return `${monday.slice(8)}/${monday.slice(5, 7)} — ${end.slice(8)}/${end.slice(5, 7)}`;
  })();

  const weekDone = (weekActs ?? []).filter((a) => a.status === 'done').length;

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8">
        <Link href="/wholesale/reps" className="text-secondary text-sm hover:underline">
          ← Comerciales
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-semibold">{rep.name}</h1>
            <p className="text-secondary text-sm mt-1">
              {[rep.zone, rep.email, rep.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
            </p>
          </div>
          <p className="text-secondary text-sm">
            {clientList.length} cliente{clientList.length === 1 ? '' : 's'} en cartera
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-1 mb-6">
        {months.map((m) => (
          <Link
            key={m}
            href={`/wholesale/reps/${id}?year=${year}&month=${m}`}
            className={`h-9 leading-9 px-3 rounded-lg text-xs font-semibold transition ${
              m === month ? 'bg-primary text-white' : 'bg-white border border-border hover:border-primary'
            }`}
          >
            {MONTHS[m - 1].slice(0, 3)}
          </Link>
        ))}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={`Ventas · ${MONTHS[month - 1]}`}
          value={cop(monthStats.revenue)}
          hint={monthBudget.amount > 0 ? `Meta ${cop(monthBudget.amount)}` : 'Sin presupuesto definido'}
          tone={ratio === null ? 'neutral' : ratio >= 1 ? 'success' : 'warning'}
        />
        <MetricCard
          label="Cumplimiento valor"
          value={ratio === null ? '—' : `${Math.round(ratio * 100)}%`}
          hint={`Año: ${cop(yearStats.revenue)}`}
          tone={ratio === null ? 'neutral' : ratio >= 1 ? 'success' : 'warning'}
        />
        <MetricCard
          label="Cumplimiento unidades"
          value={unitRatio === null ? '—' : `${Math.round(unitRatio * 100)}%`}
          hint={`${monthStats.units} de ${monthBudget.units || '—'} und`}
          tone={unitRatio === null ? 'neutral' : unitRatio >= 1 ? 'success' : 'warning'}
        />
        <MetricCard
          label="ASP del mes"
          value={monthStats.asp > 0 ? cop(monthStats.asp) : '—'}
          hint={monthStats.count > 0 ? `Binaural ${pct(monthStats.binauralRate)}` : 'Sin ventas este mes'}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] mt-8 items-start">
        <section className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-semibold">Agenda de la semana</h2>
              <p className="text-secondary text-xs mt-1">
                {weekLabel} · {(weekActs ?? []).length} actividad
                {(weekActs ?? []).length === 1 ? '' : 'es'}, {weekDone} cumplida
                {weekDone === 1 ? '' : 's'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/wholesale/reps/${id}?year=${year}&month=${month}&week=${addDays(monday, -7)}`}
                className="h-9 px-3 leading-9 rounded-lg border border-border text-sm hover:border-primary transition"
              >
                ←
              </Link>
              <Link
                href={`/wholesale/reps/${id}?year=${year}&month=${month}`}
                className="h-9 px-3 leading-9 rounded-lg border border-border text-sm hover:border-primary transition"
              >
                Hoy
              </Link>
              <Link
                href={`/wholesale/reps/${id}?year=${year}&month=${month}&week=${addDays(monday, 7)}`}
                className="h-9 px-3 leading-9 rounded-lg border border-border text-sm hover:border-primary transition"
              >
                →
              </Link>
            </div>
          </div>
          <WeekAgenda
            repId={id}
            monday={monday}
            activities={(weekActs ?? []) as Activity[]}
            clients={clientList}
            today={today}
          />
        </section>

        <section className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="font-semibold">Actividad de {MONTHS[month - 1]}</h2>
          <p className="text-secondary text-xs mt-1 mb-4">
            Cumplidas contra la meta que fija coordinación.
          </p>
          <ActivityTargets
            repId={id}
            year={year}
            month={month}
            rows={activityRows}
            canEdit={me.role === 'coordinator'}
          />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-6 items-start">
        <section className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="font-semibold">Objetivos de {MONTHS[month - 1]}</h2>
          <p className="text-secondary text-xs mt-1 mb-4">
            Los define coordinación; el avance lo reporta quien ejecuta.
          </p>

          <div className="space-y-3">
            {monthGoals.length === 0 && (
              <p className="text-secondary text-sm">Todavía no hay objetivos para este mes.</p>
            )}
            {monthGoals.map((g) => (
              <ProgressCard
                key={g.id}
                kind="goal"
                id={g.id}
                repId={id}
                title={g.title}
                subtitle={g.description}
                meta={g.target_value ? `Meta: ${cop(Number(g.target_value))}` : null}
                progress={g.progress_percent}
                status={g.status as GoalStatus}
                note={g.progress_note}
              />
            ))}
            {me.role === 'coordinator' && <NewGoalForm repId={id} year={year} month={month} />}
          </div>

          {otherGoals.length > 0 && (
            <details className="mt-5">
              <summary className="text-secondary text-sm cursor-pointer hover:text-foreground">
                Otros objetivos del año ({otherGoals.length})
              </summary>
              <div className="space-y-3 mt-3">
                {otherGoals.map((g) => (
                  <ProgressCard
                    key={g.id}
                    kind="goal"
                    id={g.id}
                    repId={id}
                    title={g.title}
                    subtitle={MONTHS[g.month - 1]}
                    meta={g.target_value ? `Meta: ${cop(Number(g.target_value))}` : null}
                    progress={g.progress_percent}
                    status={g.status as GoalStatus}
                    note={g.progress_note}
                  />
                ))}
              </div>
            </details>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="font-semibold">Proyectos</h2>
          <p className="text-secondary text-xs mt-1 mb-4">
            Eventos, campañas y capacitaciones trabajados con coordinación.
          </p>

          <div className="space-y-3">
            {(projects ?? []).length === 0 && (
              <p className="text-secondary text-sm">Sin proyectos registrados.</p>
            )}
            {(projects ?? []).map((p) => (
              <ProgressCard
                key={p.id}
                kind="project"
                id={p.id}
                repId={id}
                title={p.title}
                subtitle={[
                  KIND_LABEL[p.kind] ?? 'Proyecto',
                  p.client_id ? clientName.get(p.client_id) : null,
                ].filter(Boolean).join(' · ')}
                meta={[
                  p.starts_on && p.ends_on ? `${p.starts_on} → ${p.ends_on}` : p.starts_on,
                  p.budget_amount ? `Inversión ${cop(Number(p.budget_amount))}` : null,
                ].filter(Boolean).join(' · ') || null}
                progress={p.progress_percent}
                status={p.status as GoalStatus}
                note={p.progress_note}
              />
            ))}
            <NewProjectForm repId={id} clients={clientList} />
          </div>
        </section>
      </div>

      {clientList.length > 0 && (
        <section className="mt-8 bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Cartera</h2>
          <div className="flex flex-wrap gap-2">
            {clientList.map((c) => (
              <Link
                key={c.id}
                href={`/wholesale/clients/${c.id}`}
                className="px-3 py-2 rounded-lg border border-border text-sm hover:border-primary transition"
              >
                {c.name}
                {c.city && <span className="text-secondary text-xs"> · {c.city}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </WholesaleLayout>
  );
}
