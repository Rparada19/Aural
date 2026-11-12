import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { EmptyState } from '@/components/wholesale/MetricCard';
import { RelationMap } from '@/components/wholesale/crm/RelationMap';
import { requireWholesaleMe } from '@/lib/wholesale';
import { OPEN_STAGES, STAGE_LABEL, today, daysSince, type Stage } from '@/lib/crm';

export const dynamic = 'force-dynamic';

export default async function NetworkPage() {
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();
  const t = today();
  const d30 = new Date(Date.parse(t) - 30 * 86_400_000).toISOString().slice(0, 10);
  const d90 = new Date(Date.parse(t) - 90 * 86_400_000).toISOString().slice(0, 10);

  const [{ data: opps }, { data: inter }, { data: contacts }, { data: reps }] = await Promise.all([
    supabase.from('wholesale_opportunities').select('id, name, stage, rep_id, created_at').is('deleted_at', null),
    supabase.from('wholesale_interactions').select('opportunity_id, happened_on, rep_ids, contact_ids').gte('happened_on', d90),
    supabase.from('wholesale_opp_contacts').select('id, opportunity_id, name, role, influence, sentiment'),
    supabase.from('wholesale_reps').select('id, name').is('deleted_at', null).eq('is_active', true).order('name'),
  ]);

  const open = (opps ?? []).filter((o) => OPEN_STAGES.includes(o.stage as Stage));
  const openIds = new Set(open.map((o) => o.id));
  const oppName = new Map((opps ?? []).map((o) => [o.id, o.name]));
  const touchedContacts = new Set((inter ?? []).flatMap((i) => i.contact_ids ?? []));
  const lastByOpp = new Map<string, string>();
  for (const i of inter ?? []) {
    const p = lastByOpp.get(i.opportunity_id);
    if (!p || i.happened_on > p) lastByOpp.set(i.opportunity_id, i.happened_on);
  }

  const stats = (reps ?? []).map((r) => {
    const mine = (inter ?? []).filter((i) => (i.rep_ids ?? []).includes(r.id));
    const recent = mine.filter((i) => i.happened_on >= d30);
    const people = new Set(recent.flatMap((i) => i.contact_ids ?? []));
    const myOpen = open.filter((o) => o.rep_id === r.id);
    const deciders = (contacts ?? []).filter((c) => c.influence === 'decide' && myOpen.some((o) => o.id === c.opportunity_id));
    const cold = myOpen.filter((o) => (daysSince(lastByOpp.get(o.id) ?? o.created_at) ?? 0) > 14);
    return {
      ...r, recent: recent.length, people: people.size, open: myOpen.length,
      deciders: deciders.length, decidersTouched: deciders.filter((c) => touchedContacts.has(c.id)).length,
      cold: cold.length, shared: mine.filter((i) => (i.rep_ids ?? []).length > 1).length,
    };
  }).filter((s) => me.isCoordination ? s.open + s.recent > 0 : s.id === me.repId);

  const edgesMap = new Map<string, { from: string; to: string; n: number; last: string }>();
  for (const i of inter ?? []) {
    if (!openIds.has(i.opportunity_id)) continue;
    for (const r of i.rep_ids ?? []) {
      const k = `${r}|${i.opportunity_id}`;
      const p = edgesMap.get(k) ?? { from: r, to: i.opportunity_id, n: 0, last: '' };
      edgesMap.set(k, { ...p, n: p.n + 1, last: i.happened_on > p.last ? i.happened_on : p.last });
    }
  }
  const leftIds = [...new Set([...edgesMap.values()].map((e) => e.from).concat(open.map((o) => o.rep_id).filter(Boolean) as string[]))];
  const repName = new Map((reps ?? []).map((r) => [r.id, r.name]));

  const unreached = (contacts ?? [])
    .filter((c) => c.influence === 'decide' && openIds.has(c.opportunity_id) && !touchedContacts.has(c.id));
  const against = (contacts ?? []).filter((c) => c.sentiment === 'en_contra' && openIds.has(c.opportunity_id));

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline="Wholesale · CRM"
        title="Red de relaciones"
        subtitle="Quién de Aural está hablando con quién en cada centro, en los últimos 90 días. Las ventas grandes se cierran con varias relaciones, no con una."
        actions={<Link href="/wholesale/oportunidades" className="wsale-btn-ghost">← Oportunidades</Link>}
      />

      {open.length === 0 ? (
        <EmptyState title="Sin oportunidades abiertas" description="Cuando registres oportunidades e interacciones, aquí verás el mapa de relaciones del canal." />
      ) : (
        <>
          <section className="wsale-panel overflow-x-auto mb-6">
            <table className="wsale-table">
              <thead>
                <tr>
                  <th>Comercial</th>
                  <th className="num">Interacciones 30 d</th>
                  <th className="num">Personas contactadas</th>
                  <th className="num">Oportunidades abiertas</th>
                  <th className="num">Decisores contactados</th>
                  <th className="num">En equipo</th>
                  <th className="num">Frías +14 d</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.id}>
                    <td><Link href={`/wholesale/oportunidades?rep=${s.id}`} className="hover:text-[var(--accent)]">{s.name}</Link></td>
                    <td className="num">{s.recent}</td>
                    <td className="num">{s.people}</td>
                    <td className="num">{s.open}</td>
                    <td className={`num ${s.deciders && s.decidersTouched < s.deciders ? 'wsale-warn' : ''}`}>{s.decidersTouched} de {s.deciders}</td>
                    <td className="num">{s.shared}</td>
                    <td className={`num ${s.cold ? 'wsale-bad' : ''}`}>{s.cold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="wsale-panel p-5 mb-6">
            <p className="wsale-overline mb-3">Comerciales ↔ oportunidades abiertas</p>
            <RelationMap
              leftTitle="Aural" rightTitle="Centros"
              left={leftIds.map((id) => ({ id, label: repName.get(id) ?? 'Comercial' }))}
              right={open.map((o) => ({
                id: o.id, label: o.name, href: `/wholesale/oportunidades/${o.id}`,
                sub: `${STAGE_LABEL[o.stage as Stage]}${lastByOpp.get(o.id) ? ` · último ${lastByOpp.get(o.id)}` : ''}`,
                tone: ['propuesta', 'negociacion'].includes(o.stage) ? 'good' : 'neutral',
              }))}
              edges={[...edgesMap.values()]}
            />
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="wsale-panel p-5">
              <p className="wsale-overline mb-3">Decisores sin contacto</p>
              {unreached.length === 0 ? <p className="text-[13px] text-[var(--ink-soft)]">Todos los decisores tienen al menos una interacción.</p> : (
                <ul className="space-y-2">
                  {unreached.map((c) => (
                    <li key={c.id} className="text-[13px]">
                      <Link href={`/wholesale/oportunidades/${c.opportunity_id}`} className="hover:text-[var(--accent)]">{c.name}</Link>
                      <span className="text-[var(--ink-faint)]"> · {c.role || 'Sin cargo'} · {oppName.get(c.opportunity_id)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="wsale-panel p-5">
              <p className="wsale-overline mb-3">Personas en contra</p>
              {against.length === 0 ? <p className="text-[13px] text-[var(--ink-soft)]">Nadie marcado en contra.</p> : (
                <ul className="space-y-2">
                  {against.map((c) => (
                    <li key={c.id} className="text-[13px]">
                      <Link href={`/wholesale/oportunidades/${c.opportunity_id}`} className="hover:text-[var(--accent)]">{c.name}</Link>
                      <span className="text-[var(--ink-faint)]"> · {c.role || 'Sin cargo'} · {oppName.get(c.opportunity_id)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </WholesaleLayout>
  );
}
