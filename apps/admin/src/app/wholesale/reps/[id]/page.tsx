import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout } from '@/components/WholesaleLayout';
import { MetricCard } from '@/components/wholesale/MetricCard';
import { ProgressCard, type GoalStatus } from '@/components/wholesale/ProgressCard';
import { NewGoalForm, NewProjectForm } from '@/components/wholesale/NewGoalForm';
import { Agenda, type Activity } from '@/components/wholesale/Agenda';
import { ActivityTargets } from '@/components/wholesale/ActivityTargets';
import { ActivityTypeManager } from '@/components/wholesale/ActivityTypeManager';
import { Expenses, type Expense, type ExpenseCategory } from '@/components/wholesale/Expenses';
import { RepAccess, type LinkedProfile } from '@/components/wholesale/RepAccess';
import { Loans } from '@/components/wholesale/Loans';
import type { Loan } from '@/lib/loans';
import {
  agendaRange, shiftAnchor, mondayOf, monthStart, monthEnd,
  type ActivityType, type AgendaView,
} from '@/lib/activities';
import { requireWholesaleMe, salesMetrics, cop, pct } from '@/lib/wholesale';

export const dynamic = 'force-dynamic';

const SHOW_ACCESS = false;

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
  searchParams: Promise<{ year?: string; month?: string; week?: string; view?: string; on?: string }>;
}) {
  const { id } = await params;
  const { year: yearParam, month: monthParam, view: viewParam, on: onParam } = await searchParams;
  const me = await requireWholesaleMe();

  // El comercial solo entra a su propia ficha.
  if (me.role === 'rep' && me.repId !== id) notFound();

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  const month = Number(monthParam) || now.getMonth() + 1;
  const today = now.toISOString().slice(0, 10);
  const view: AgendaView =
    viewParam === 'day' || viewParam === 'month' ? viewParam : 'week';
  const anchor = onParam ?? (view === 'week' ? mondayOf(now) : today);
  const { from: agendaFrom, to: agendaTo } = agendaRange(view, anchor);
  const monthFrom = monthStart(year, month);
  const monthTo = monthEnd(year, month);
  const supabase = await createSupabaseServerClient();

  const [{ data: rep }, { data: clients }, { data: sales }, { data: budgets }, { data: goals }, { data: projects },
         { data: weekActs }, { data: monthActs }, { data: actTargets }, { data: types },
         { data: expenses }, { data: expenseCats },
         { data: loans }, { data: platforms }, { data: techLevels }, { data: pStyles },
         { data: profiles }] =
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
        .gte('scheduled_on', view === 'month' ? agendaFrom : agendaFrom)
        .lte('scheduled_on', agendaTo),
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
      supabase
        .from('wholesale_activity_types')
        .select('slug, label, icon, sort_order, is_active')
        .order('sort_order'),
      supabase
        .from('wholesale_expenses')
        .select('id, client_id, category, spent_on, amount, description')
        .eq('rep_id', id)
        .is('deleted_at', null)
        .gte('spent_on', monthFrom)
        .lte('spent_on', monthTo)
        .order('spent_on', { ascending: false }),
      supabase
        .from('wholesale_expense_categories')
        .select('slug, label, icon, is_active')
        .order('sort_order'),
      supabase
        .from('wholesale_loans')
        .select('id, client_id, rep_id, loaned_on, due_on, returned_on, platform, tech_level, style, units, binaural, rechargeable, serials, patient_name, notes, status')
        .eq('rep_id', id)
        .is('deleted_at', null)
        .order('due_on'),
      supabase.from('wholesale_platforms').select('slug, label').eq('is_active', true).order('sort_order'),
      supabase.from('wholesale_tech_levels').select('slug, label').eq('is_active', true).order('sort_order'),
      supabase.from('wholesale_product_styles').select('slug, label').eq('is_active', true).order('sort_order'),
      supabase
        .from('profiles')
        .select('id, full_name, email, admin_role, linked_wholesale_rep_id')
        .or(`linked_wholesale_rep_id.eq.${id},and(admin_role.is.null,is_admin.is.false)`)
        .limit(200),
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

  const typeList = ((types ?? []) as ActivityType[]).filter((t) => t.is_active);
  const targetByKind = new Map((actTargets ?? []).map((t) => [t.kind, t.target]));
  const activityRows = typeList.map((k) => {
    const mine = (monthActs ?? []).filter((a) => a.kind === k.slug);
    return {
      kind: k.slug,
      target: targetByKind.get(k.slug) ?? 0,
      doneCount: mine.filter((a) => a.status === 'done').length,
      plannedCount: mine.filter((a) => a.status === 'planned').length,
    };
  });

  const rangeLabel =
    view === 'day' ? `${agendaFrom.slice(8)}/${agendaFrom.slice(5, 7)}`
    : view === 'month' ? `${MONTHS[Number(agendaFrom.slice(5, 7)) - 1]} ${agendaFrom.slice(0, 4)}`
    : `${agendaFrom.slice(8)}/${agendaFrom.slice(5, 7)} — ${agendaTo.slice(8)}/${agendaTo.slice(5, 7)}`;

  const agendaDone = (weekActs ?? []).filter((a) => a.status === 'done').length;
  const agendaHref = (v: AgendaView, on: string) =>
    `/wholesale/reps/${id}?year=${year}&month=${month}&view=${v}&on=${on}`;

  const profileList = (profiles ?? []) as (LinkedProfile & {
    admin_role: string | null; linked_wholesale_rep_id: string | null;
  })[];
  const linkedProfile = profileList.find((p) => p.linked_wholesale_rep_id === id) ?? null;
  const candidateProfiles = profileList.filter((p) => p.linked_wholesale_rep_id !== id);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <header className="mb-8">
        <Link href="/wholesale/reps" className="text-[var(--ink-soft)] text-sm hover:underline">
          ← Comerciales
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-semibold">{rep.name}</h1>
            <p className="text-[var(--ink-soft)] text-sm mt-1">
              {[rep.zone, rep.email, rep.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[var(--ink-soft)] text-sm">
              {clientList.length} cliente{clientList.length === 1 ? '' : 's'} en cartera
            </p>
            <Link
              href={`/wholesale/reps/${id}/reporte?year=${year}&month=${month}`}
              className="wsale-btn-ghost"
            >
              Reporte PDF
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-1 mb-6">
        {months.map((m) => (
          <Link
            key={m}
            href={`/wholesale/reps/${id}?year=${year}&month=${m}`}
            className="wsale-chip" data-on={m === month}
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
        <section className="wsale-panel p-6">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div>
              <h2 className="font-semibold">Agenda</h2>
              <p className="text-[var(--ink-soft)] text-xs mt-1">
                {rangeLabel} · {(weekActs ?? []).length} actividad
                {(weekActs ?? []).length === 1 ? '' : 'es'}, {agendaDone} cumplida
                {agendaDone === 1 ? '' : 's'}
              </p>
            </div>

            <div className="flex gap-2 items-center">
              <div className="flex rounded-[2px] border border-[var(--rule)] overflow-hidden">
                {([['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']] as const).map(([v, label]) => (
                  <Link
                    key={v}
                    href={agendaHref(v, v === 'week' ? mondayOf(new Date(`${anchor}T00:00:00Z`)) : anchor)}
                    className={`h-9 px-3 leading-9 text-sm transition ${
                      view === v ? 'bg-[var(--ink)] text-white' : 'bg-white hover:bg-[rgba(16,35,63,.05)]'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
              <Link href={agendaHref(view, shiftAnchor(view, anchor, -1))}
                className="h-9 px-3 leading-9 rounded-[2px] border border-[var(--rule)] text-sm hover:border-[var(--rule-strong)] transition">←</Link>
              <Link href={agendaHref(view, view === 'week' ? mondayOf(now) : today)}
                className="h-9 px-3 leading-9 rounded-[2px] border border-[var(--rule)] text-sm hover:border-[var(--rule-strong)] transition">Hoy</Link>
              <Link href={agendaHref(view, shiftAnchor(view, anchor, 1))}
                className="h-9 px-3 leading-9 rounded-[2px] border border-[var(--rule)] text-sm hover:border-[var(--rule-strong)] transition">→</Link>
            </div>
          </div>

          <Agenda
            view={view}
            anchor={anchor}
            repId={id}
            types={typeList}
            activities={(weekActs ?? []) as Activity[]}
            clients={clientList}
            today={today}
          />
        </section>

        <section className="wsale-panel p-6">
          <h2 className="font-semibold">Actividad de {MONTHS[month - 1]}</h2>
          <p className="text-[var(--ink-soft)] text-xs mt-1 mb-4">
            Cumplidas contra la meta que fija coordinación.
          </p>
          <ActivityTargets
            repId={id}
            year={year}
            month={month}
            rows={activityRows}
            types={typeList}
            canEdit={me.role === 'coordinator'}
          />
          {me.role === 'coordinator' && (
            <ActivityTypeManager types={(types ?? []) as ActivityType[]} />
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-6 items-start">
        <section className="wsale-panel p-6">
          <h2 className="font-semibold">Objetivos de {MONTHS[month - 1]}</h2>
          <p className="text-[var(--ink-soft)] text-xs mt-1 mb-4">
            Los define coordinación; el avance lo reporta quien ejecuta.
          </p>

          <div className="space-y-3">
            {monthGoals.length === 0 && (
              <p className="text-[var(--ink-soft)] text-sm">Todavía no hay objetivos para este mes.</p>
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
              <summary className="text-[var(--ink-soft)] text-sm cursor-pointer hover:text-[var(--ink)]">
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

        <section className="wsale-panel p-6">
          <h2 className="font-semibold">Proyectos</h2>
          <p className="text-[var(--ink-soft)] text-xs mt-1 mb-4">
            Eventos, campañas y capacitaciones trabajados con coordinación.
          </p>

          <div className="space-y-3">
            {(projects ?? []).length === 0 && (
              <p className="text-[var(--ink-soft)] text-sm">Sin proyectos registrados.</p>
            )}
            {(projects ?? []).map((p) => (
              <ProgressCard
                key={p.id}
                href={`/wholesale/proyectos/${p.id}`}
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

      {/* Gestión de accesos: lista pero apagada hasta que se decida abrir
          el sistema a los comerciales. Poner SHOW_ACCESS en true la revive. */}
      {SHOW_ACCESS && me.role === 'coordinator' && (
        <section className="mt-6 wsale-panel p-6">
          <h2 className="font-semibold">Acceso al sistema</h2>
          <p className="text-[var(--ink-soft)] text-xs mt-1 mb-4">
            Con usuario propio, el comercial entra a wholesale y ve solo lo suyo.
          </p>
          <RepAccess
            repId={id}
            repName={rep.name}
            repEmail={rep.email}
            linked={linkedProfile}
            candidates={candidateProfiles}
          />
        </section>
      )}

      <section className="mt-6 wsale-panel p-6">
        <Loans
          loans={(loans ?? []) as Loan[]}
          clients={clientList}
          catalogs={{
            platforms: platforms ?? [],
            techLevels: techLevels ?? [],
            styles: pStyles ?? [],
          }}
          canCreate
          showClient
        />
      </section>

      <section className="mt-6 wsale-panel p-6">
        <Expenses
          repId={id}
          expenses={(expenses ?? []) as Expense[]}
          categories={(expenseCats ?? []) as ExpenseCategory[]}
          clients={clientList}
          monthLabel={MONTHS[month - 1]}
          defaultDate={month === now.getMonth() + 1 && year === now.getFullYear() ? today : monthFrom}
          sheetHref={`/wholesale/reps/${id}/gastos?year=${year}&month=${month}`}
        />
      </section>

      {clientList.length > 0 && (
        <section className="mt-6 wsale-panel p-6">
          <h2 className="font-semibold mb-4">Cartera</h2>
          <div className="flex flex-wrap gap-2">
            {clientList.map((c) => (
              <Link
                key={c.id}
                href={`/wholesale/clients/${c.id}`}
                className="px-3 py-2 rounded-[2px] border border-[var(--rule)] text-sm hover:border-[var(--rule-strong)] transition"
              >
                {c.name}
                {c.city && <span className="text-[var(--ink-soft)] text-xs"> · {c.city}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </WholesaleLayout>
  );
}
