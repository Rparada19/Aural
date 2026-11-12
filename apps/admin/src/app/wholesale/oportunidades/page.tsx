import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { MetricCard, EmptyState } from '@/components/wholesale/MetricCard';
import { NewOpportunity } from '@/components/wholesale/crm/NewOpportunity';
import { requireWholesaleMe, cop } from '@/lib/wholesale';
import {
  OPEN_STAGES, STAGE_LABEL, KIND_LABEL, prob, today, daysSince, type Stage,
} from '@/lib/crm';

export const dynamic = 'force-dynamic';

const NEW_ACCOUNTS_GOAL = 20;
const GROWTH = 0.2;

type Opp = {
  id: string; name: string; kind: string; rep_id: string | null; client_id: string | null;
  city: string | null; stage: Stage; est_amount: number | null; est_units: number | null;
  probability: number | null; expected_close: string | null; next_action: string | null;
  next_action_on: string | null; won_on: string | null; created_at: string;
};

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ rep?: string; tipo?: string }>;
}) {
  const sp = await searchParams;
  const me = await requireWholesaleMe('oportunidades');
  const supabase = await createSupabaseServerClient();
  const t = today();
  const year = t.slice(0, 4);
  const since = new Date(Date.parse(t) - 365 * 86_400_000).toISOString().slice(0, 10);
  const since18 = new Date(Date.parse(t) - 540 * 86_400_000).toISOString().slice(0, 10);

  const [{ data: oppsRaw }, { data: reps }, { data: clients }, { data: sales }, { data: touches }] = await Promise.all([
    supabase.from('wholesale_opportunities')
      .select('id, name, kind, rep_id, client_id, city, stage, est_amount, est_units, probability, expected_close, next_action, next_action_on, won_on, created_at')
      .is('deleted_at', null),
    supabase.from('wholesale_reps').select('id, name').is('deleted_at', null).eq('is_active', true).order('name'),
    supabase.from('wholesale_clients').select('id, name, city, zone, rep_id').is('deleted_at', null).eq('is_active', true).order('name'),
    supabase.from('wholesale_sales').select('client_id, sold_on, net_amount').is('deleted_at', null).gte('sold_on', since18),
    supabase.from('wholesale_interactions').select('opportunity_id, happened_on'),
  ]);

  const repName = new Map((reps ?? []).map((r) => [r.id, r.name]));
  let opps = (oppsRaw ?? []) as Opp[];
  if (sp.rep) opps = opps.filter((o) => o.rep_id === sp.rep);
  if (sp.tipo) opps = opps.filter((o) => o.kind === sp.tipo);

  const lastTouch = new Map<string, string>();
  for (const i of touches ?? []) {
    const p = lastTouch.get(i.opportunity_id);
    if (!p || i.happened_on > p) lastTouch.set(i.opportunity_id, i.happened_on);
  }

  const open = opps.filter((o) => OPEN_STAGES.includes(o.stage));
  const weighted = open.reduce((a, o) => a + Number(o.est_amount ?? 0) * prob(o) / 100, 0);
  const pipeline = open.reduce((a, o) => a + Number(o.est_amount ?? 0), 0);
  const wonYear = opps.filter((o) => o.stage === 'ganado' && (o.won_on ?? '').startsWith(year));
  const newWon = wonYear.filter((o) => o.kind === 'cuenta_nueva').length;
  const overdue = open.filter((o) => o.next_action_on && o.next_action_on < t);
  const noNext = open.filter((o) => !o.next_action_on);
  const closedYear = opps.filter((o) => (o.stage === 'ganado' || o.stage === 'perdido') && o.created_at.slice(0, 4) === year);
  const winRate = closedYear.length ? wonYear.length / closedYear.length : null;

  // Base del crecimiento: ventas de los últimos 12 meses
  const base = (sales ?? []).filter((s) => s.sold_on >= since).reduce((a, s) => a + Number(s.net_amount ?? 0), 0);
  const gap = base * GROWTH;
  const coverage = gap > 0 ? weighted / gap : 0;

  // Clientes que compraban y llevan más de 90 días sin comprar, sin oportunidad abierta
  const lastSale = new Map<string, { last: string; total: number }>();
  for (const s of sales ?? []) {
    const p = lastSale.get(s.client_id) ?? { last: '', total: 0 };
    lastSale.set(s.client_id, { last: s.sold_on > p.last ? s.sold_on : p.last, total: p.total + Number(s.net_amount ?? 0) });
  }
  const withOpen = new Set((oppsRaw ?? []).filter((o) => OPEN_STAGES.includes(o.stage as Stage)).map((o) => o.client_id));
  const reactivate = (clients ?? [])
    .filter((c) => (me.isCoordination || c.rep_id === me.repId) && !withOpen.has(c.id))
    .map((c) => ({ ...c, ...(lastSale.get(c.id) ?? { last: '', total: 0 }) }))
    .filter((c) => c.last && (daysSince(c.last) ?? 0) > 90)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const followUps = open
    .filter((o) => o.next_action_on && o.next_action_on <= new Date(Date.parse(t) + 7 * 86_400_000).toISOString().slice(0, 10))
    .sort((a, b) => (a.next_action_on ?? '').localeCompare(b.next_action_on ?? ''));

  const maxCount = Math.max(1, ...OPEN_STAGES.map((s) => open.filter((o) => o.stage === s).length));
  const qs = (k: string, v?: string) => {
    const p = new URLSearchParams();
    if (sp.rep) p.set('rep', sp.rep);
    if (sp.tipo) p.set('tipo', sp.tipo);
    if (v) p.set(k, v); else p.delete(k);
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline="Wholesale · CRM"
        title="Oportunidades"
        subtitle="Cada prospecto con su etapa, sus personas y su próximo paso. Lo que no tiene fecha, no avanza."
        actions={
          <>
            <Link href="/wholesale/oportunidades/red" className="wsale-btn-ghost">Red de relaciones</Link>
            <NewOpportunity reps={reps ?? []} clients={clients ?? []} isCoordination={me.role !== 'rep'} defaultRep={me.repId} />
          </>
        }
      />

      <section className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-6">
        <MetricCard label="Meta de crecimiento" value={cop(gap)} hint={`20% sobre ${cop(base)} de los últimos 12 meses`} />
        <MetricCard
          label="Embudo ponderado" value={cop(weighted)}
          hint={gap > 0 ? `Cubre el ${Math.round(coverage * 100)}% de la meta · total ${cop(pipeline)}` : `Total sin ponderar ${cop(pipeline)}`}
          tone={coverage >= 1 ? 'success' : coverage >= 0.5 ? 'warning' : 'alert'}
        />
        <MetricCard label="Cuentas nuevas ganadas" value={`${newWon} de ${NEW_ACCOUNTS_GOAL}`} hint={`Año ${year}`} tone={newWon >= NEW_ACCOUNTS_GOAL ? 'success' : 'neutral'} />
        <MetricCard label="Tasa de cierre" value={winRate === null ? '—' : `${Math.round(winRate * 100)}%`} hint={`${wonYear.length} ganadas en ${year}`} />
        <MetricCard
          label="Seguimientos vencidos" value={String(overdue.length)}
          hint={noNext.length ? `${noNext.length} sin próxima acción` : 'Todas tienen próximo paso'}
          tone={overdue.length ? 'alert' : 'success'}
        />
      </section>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {me.isCoordination && (
          <>
            <Link href={`/wholesale/oportunidades${qs('rep')}`} className="wsale-chip" data-on={!sp.rep}>Todo el equipo</Link>
            {(reps ?? []).map((r) => (
              <Link key={r.id} href={`/wholesale/oportunidades${qs('rep', r.id)}`} className="wsale-chip" data-on={sp.rep === r.id}>{r.name}</Link>
            ))}
            <span className="w-px h-5 bg-[var(--rule)] mx-1" />
          </>
        )}
        <Link href={`/wholesale/oportunidades${qs('tipo')}`} className="wsale-chip" data-on={!sp.tipo}>Todos los tipos</Link>
        {Object.entries(KIND_LABEL).map(([k, v]) => (
          <Link key={k} href={`/wholesale/oportunidades${qs('tipo', k)}`} className="wsale-chip" data-on={sp.tipo === k}>{v}</Link>
        ))}
      </div>

      {opps.length === 0 && reactivate.length === 0 ? (
        <EmptyState
          title="Aún no hay oportunidades"
          description="Registra cada centro que quieras abrir, cada contrato por volumen y cada cliente por reactivar. El tablero te dirá a quién llamar cada día."
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] mb-8">
            <section className="wsale-panel p-5">
              <p className="wsale-overline mb-4">Embudo abierto</p>
              <div className="space-y-2.5">
                {OPEN_STAGES.map((s) => {
                  const list = open.filter((o) => o.stage === s);
                  const val = list.reduce((a, o) => a + Number(o.est_amount ?? 0), 0);
                  return (
                    <div key={s} className="grid grid-cols-[120px_1fr_130px] items-center gap-3 text-[13px]">
                      <span className="text-[var(--ink-soft)]">{STAGE_LABEL[s]}</span>
                      <div className="h-6 bg-[var(--paper)] rounded-[2px] overflow-hidden">
                        <div className="h-full bg-[var(--accent)]/80 flex items-center px-2 text-white text-[11px]" style={{ width: `${Math.max(list.length / maxCount * 100, list.length ? 8 : 0)}%` }}>
                          {list.length || ''}
                        </div>
                      </div>
                      <span className="wsale-figure text-right">{val ? cop(val) : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="wsale-panel p-5">
              <p className="wsale-overline mb-3">Seguimientos de esta semana</p>
              {followUps.length === 0 ? (
                <p className="text-[13px] text-[var(--ink-soft)]">Nada agendado para los próximos 7 días.</p>
              ) : (
                <ul className="space-y-3">
                  {followUps.slice(0, 10).map((o) => {
                    const late = (o.next_action_on ?? '') < t;
                    const isToday = o.next_action_on === t;
                    return (
                      <li key={o.id}>
                        <Link href={`/wholesale/oportunidades/${o.id}`} className="block hover:text-[var(--accent)]">
                          <p className="text-[13px] leading-snug">{o.next_action ?? 'Seguimiento'}</p>
                          <p className="text-[11px] text-[var(--ink-faint)]">
                            <span className={late ? 'wsale-bad' : isToday ? 'wsale-warn' : ''}>
                              {late ? `Vencido ${o.next_action_on}` : isToday ? 'Hoy' : o.next_action_on}
                            </span>
                            {' · '}{o.name}{o.rep_id && me.isCoordination ? ` · ${repName.get(o.rep_id)}` : ''}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <section className="mb-8 overflow-x-auto">
            <div className="grid grid-flow-col auto-cols-[250px] gap-3 pb-2">
              {OPEN_STAGES.map((s) => {
                const list = open.filter((o) => o.stage === s)
                  .sort((a, b) => (a.next_action_on ?? '9999').localeCompare(b.next_action_on ?? '9999'));
                return (
                  <div key={s} className="bg-[var(--paper)] border border-[var(--rule)] rounded-[3px] p-2.5 min-h-[160px]">
                    <p className="wsale-overline px-1 mb-2">{STAGE_LABEL[s]} · {list.length}</p>
                    <div className="space-y-2">
                      {list.map((o) => {
                        const silent = daysSince(lastTouch.get(o.id) ?? o.created_at);
                        const late = o.next_action_on && o.next_action_on < t;
                        return (
                          <Link key={o.id} href={`/wholesale/oportunidades/${o.id}`} className="block wsale-panel p-3 hover:border-[var(--accent)] transition">
                            <p className="text-[13px] leading-snug">{o.name}</p>
                            <p className="text-[11px] text-[var(--ink-faint)] mt-0.5">
                              {[KIND_LABEL[o.kind], o.city, me.isCoordination && o.rep_id ? repName.get(o.rep_id) : null].filter(Boolean).join(' · ')}
                            </p>
                            <div className="flex items-baseline justify-between mt-2">
                              <span className="wsale-figure text-[13px]">{o.est_amount ? cop(Number(o.est_amount)) : '—'}</span>
                              <span className="text-[10px] text-[var(--ink-faint)]">{prob(o)}%</span>
                            </div>
                            <p className={`text-[11px] mt-1.5 ${late ? 'wsale-bad' : !o.next_action_on ? 'wsale-warn' : 'text-[var(--ink-soft)]'}`}>
                              {o.next_action_on ? `${o.next_action ?? 'Seguimiento'} · ${o.next_action_on}` : 'Sin próxima acción'}
                            </p>
                            {silent !== null && silent > 14 && (
                              <p className="text-[10px] wsale-warn mt-0.5">{silent} días sin contacto</p>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {reactivate.length > 0 && (
            <section className="wsale-panel p-5 mb-8">
              <p className="wsale-overline mb-1">Clientes para reactivar</p>
              <p className="text-[12px] text-[var(--ink-soft)] mb-4">Compraban y llevan más de 90 días sin pedir. Ordenados por lo que compraron en los últimos 18 meses.</p>
              <div className="divide-y divide-[var(--rule)]">
                {reactivate.map((c) => (
                  <div key={c.id} className="flex items-center gap-4 py-2.5">
                    <Link href={`/wholesale/clients/${c.id}`} className="flex-1 text-[13px] hover:text-[var(--accent)]">{c.name}</Link>
                    <span className="text-[11px] text-[var(--ink-faint)] w-40">Última compra {c.last} · {daysSince(c.last)} d</span>
                    <span className="wsale-figure text-[13px] w-28 text-right">{cop(c.total)}</span>
                    <NewOpportunity
                      reps={reps ?? []} clients={clients ?? []} isCoordination={me.role !== 'rep'} defaultRep={me.repId}
                      preset={{ kind: 'reactivacion', client_id: c.id }} label="Abrir"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {(wonYear.length > 0 || opps.some((o) => o.stage === 'perdido')) && (
            <details>
              <summary className="text-[13px] text-[var(--ink-soft)] cursor-pointer">Ganadas y perdidas</summary>
              <section className="wsale-panel divide-y divide-[var(--rule)] mt-3">
                {opps.filter((o) => o.stage === 'ganado' || o.stage === 'perdido').map((o) => (
                  <Link key={o.id} href={`/wholesale/oportunidades/${o.id}`} className="flex items-center gap-4 p-3 text-[13px] hover:bg-[rgba(180,85,31,0.03)]">
                    <span className={`wsale-dot ${o.stage === 'ganado' ? 'wsale-dot-good' : 'wsale-dot-bad'}`} />
                    <span className="flex-1">{o.name}</span>
                    <span className="text-[11px] text-[var(--ink-faint)]">{STAGE_LABEL[o.stage]}{o.won_on ? ` · ${o.won_on}` : ''}</span>
                    <span className="wsale-figure w-28 text-right">{o.est_amount ? cop(Number(o.est_amount)) : '—'}</span>
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
