import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { StageBar, OppDetails, Contacts, InteractionForm, DeleteInteraction, type OppData, type ContactData } from '@/components/wholesale/crm/OppPanels';
import { RelationMap } from '@/components/wholesale/crm/RelationMap';
import { requireWholesaleMe, cop } from '@/lib/wholesale';
import { KIND_LABEL, STAGE_LABEL, INTERACTION_LABEL, OUTCOME_LABEL, prob, daysSince } from '@/lib/crm';

export const dynamic = 'force-dynamic';

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireWholesaleMe('oportunidades');
  const supabase = await createSupabaseServerClient();

  const [{ data: o }, { data: contacts }, { data: inter }, { data: reps }, { data: log }] = await Promise.all([
    supabase.from('wholesale_opportunities').select('*').eq('id', id).is('deleted_at', null).maybeSingle(),
    supabase.from('wholesale_opp_contacts').select('id, name, role, influence, sentiment, phone, email, notes').eq('opportunity_id', id).order('created_at'),
    supabase.from('wholesale_interactions').select('id, kind, happened_on, rep_ids, contact_ids, summary, outcome, author_name, created_at').eq('opportunity_id', id).order('happened_on', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('wholesale_reps').select('id, name').is('deleted_at', null).eq('is_active', true).order('name'),
    supabase.from('wholesale_opp_stage_log').select('from_stage, to_stage, changed_at').eq('opportunity_id', id).order('changed_at'),
  ]);
  if (!o) notFound();
  const opp = o as OppData & { won_on: string | null; lost_reason: string | null; created_at: string };

  const repName = new Map((reps ?? []).map((r) => [r.id, r.name]));
  const people = (contacts ?? []) as ContactData[];
  const contactName = new Map(people.map((c) => [c.id, c.name]));
  const interactions = inter ?? [];

  // Pares comercial ↔ persona del centro, y contactos por persona
  const pairs = new Map<string, { from: string; to: string; n: number; last: string }>();
  const byContact: Record<string, { n: number; last: string }> = {};
  const repIds = new Set<string>();
  for (const i of interactions) {
    for (const r of i.rep_ids ?? []) repIds.add(r);
    for (const c of i.contact_ids ?? []) {
      const t = byContact[c] ?? { n: 0, last: '' };
      byContact[c] = { n: t.n + 1, last: i.happened_on > t.last ? i.happened_on : t.last };
      for (const r of i.rep_ids ?? []) {
        const k = `${r}|${c}`;
        const p = pairs.get(k) ?? { from: r, to: c, n: 0, last: '' };
        pairs.set(k, { ...p, n: p.n + 1, last: i.happened_on > p.last ? i.happened_on : p.last });
      }
    }
  }
  if (opp.rep_id) repIds.add(opp.rep_id);

  const lastTouch = interactions[0]?.happened_on ?? null;
  const silent = daysSince(lastTouch ?? opp.created_at);
  const decider = people.find((c) => c.influence === 'decide');
  const stageDays = daysSince(log?.at(-1)?.changed_at ?? opp.created_at);

  const warnings: string[] = [];
  if (!decider) warnings.push('No hay registrada una persona que decida.');
  else if (!byContact[decider.id]) warnings.push(`Nadie ha hablado aún con ${decider.name}, que es quien decide.`);
  if (people.some((c) => c.sentiment === 'en_contra')) warnings.push('Hay personas en contra: planea cómo resolver su objeción.');
  if (silent !== null && silent > 14 && opp.stage !== 'ganado' && opp.stage !== 'perdido') warnings.push(`${silent} días sin interacción registrada.`);
  if (repIds.size === 1 && people.length > 0 && opp.est_amount && Number(opp.est_amount) > 0 && ['propuesta', 'negociacion'].includes(opp.stage)) {
    warnings.push('Solo una persona de Aural lleva la relación: suma a coordinación para el cierre.');
  }

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline={`Oportunidad · ${KIND_LABEL[opp.kind] ?? ''}`}
        title={opp.name}
        subtitle={[
          opp.city, opp.rep_id ? repName.get(opp.rep_id) : 'Sin comercial',
          opp.est_amount ? `${cop(Number(opp.est_amount))} al año` : null,
          `${prob(opp)}% de probabilidad`,
          stageDays !== null ? `${stageDays} días en ${STAGE_LABEL[opp.stage].toLowerCase()}` : null,
        ].filter(Boolean).join(' · ')}
        actions={<Link href="/wholesale/oportunidades" className="wsale-btn-ghost">← Todas</Link>}
      />

      <StageBar id={opp.id} stage={opp.stage} />

      {opp.stage === 'perdido' && opp.lost_reason && (
        <p className="text-[13px] wsale-bad mb-4">Perdida por: {opp.lost_reason}</p>
      )}
      {opp.client_id && (
        <p className="text-[13px] mb-4">Ya es cliente: <Link className="text-[var(--accent)]" href={`/wholesale/clients/${opp.client_id}`}>ver ficha del cliente →</Link></p>
      )}

      {warnings.length > 0 && (
        <section className="mb-6 border-l-2 border-[var(--caution)] bg-[rgba(168,114,13,0.06)] px-4 py-3 space-y-1">
          {warnings.map((w) => <p key={w} className="text-[13px] text-[var(--ink)]">{w}</p>)}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6 min-w-0">
          <InteractionForm
            oppId={opp.id} myRep={me.repId}
            reps={(reps ?? []).map((r) => ({ id: r.id, name: r.name }))}
            contacts={people.map((c) => ({ id: c.id, name: c.name }))}
          />

          {pairs.size > 0 && (
            <section className="wsale-panel p-5">
              <p className="wsale-overline mb-1">Quién habla con quién</p>
              <p className="text-[12px] text-[var(--ink-soft)] mb-3">El grosor de la línea es el número de interacciones. En rojo, quien no ha tenido contacto.</p>
              <RelationMap
                leftTitle="Aural" rightTitle={opp.name}
                left={[...repIds].map((r) => ({ id: r, label: repName.get(r) ?? 'Comercial', sub: r === opp.rep_id ? 'Responsable' : 'Apoyo' }))}
                right={people.map((c) => ({
                  id: c.id, label: c.name, sub: [c.role, byContact[c.id] ? `último ${byContact[c.id].last}` : null].filter(Boolean).join(' · '),
                  tone: c.sentiment === 'a_favor' ? 'good' : c.sentiment === 'en_contra' ? 'bad' : 'neutral',
                  strong: c.influence === 'decide',
                }))}
                edges={[...pairs.values()]}
              />
            </section>
          )}

          <section>
            <p className="wsale-overline mb-3">Historial · {interactions.length} interacciones</p>
            {interactions.length === 0 ? (
              <p className="text-[13px] text-[var(--ink-soft)]">Todavía no hay interacciones. Registra la primera arriba.</p>
            ) : (
              <ol className="relative border-l border-[var(--rule)] ml-2 space-y-5">
                {interactions.map((i) => (
                  <li key={i.id} className="pl-5 relative">
                    <span className={`absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full ${i.outcome === 'avanza' ? 'bg-[var(--positive)]' : i.outcome === 'frena' ? 'bg-[var(--alert)]' : 'bg-[var(--ink-faint)]'}`} />
                    <p className="text-[11px] text-[var(--ink-faint)]">
                      {i.happened_on} · {INTERACTION_LABEL[i.kind] ?? i.kind} · {OUTCOME_LABEL[i.outcome]}
                    </p>
                    <p className="text-[13px] mt-1 whitespace-pre-wrap">{i.summary}</p>
                    <p className="text-[11px] text-[var(--ink-soft)] mt-1">
                      {[(i.rep_ids ?? []).map((r: string) => repName.get(r)).filter(Boolean).join(', '),
                        (i.contact_ids ?? []).map((c: string) => contactName.get(c)).filter(Boolean).join(', ')]
                        .filter(Boolean).join(' ↔ ')}
                      {i.author_name ? ` · registró ${i.author_name}` : ''}
                    </p>
                    <DeleteInteraction id={i.id} oppId={opp.id} />
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Contacts oppId={opp.id} contacts={people} touches={byContact} />
          <OppDetails o={opp} reps={(reps ?? []).map((r) => ({ id: r.id, name: r.name }))} isCoordination={me.isCoordination} canAssign={me.role !== 'rep'} />
          {(log ?? []).length > 0 && (
            <section className="text-[11px] text-[var(--ink-faint)] space-y-0.5">
              <p className="wsale-overline mb-1">Recorrido</p>
              {(log ?? []).map((l, k) => (
                <p key={k}>{l.changed_at.slice(0, 10)} · {l.from_stage ? `${STAGE_LABEL[l.from_stage as keyof typeof STAGE_LABEL]} → ` : ''}{STAGE_LABEL[l.to_stage as keyof typeof STAGE_LABEL]}</p>
              ))}
            </section>
          )}
        </aside>
      </div>
    </WholesaleLayout>
  );
}
