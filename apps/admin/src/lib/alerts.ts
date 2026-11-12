import type { SupabaseClient } from '@supabase/supabase-js';
import type { WholesaleMe } from './wholesale';
import { OPEN_STAGES, daysSince, today } from './crm';
import { OPEN_STATUS } from './cases';

export type Severity = 'alta' | 'media' | 'info' | 'logro';
export type Area = 'prestamos' | 'casos' | 'clientes' | 'oportunidades' | 'presupuesto' | 'ventas' | 'equipo' | 'celebraciones';

export interface Alert {
  id: string; sev: Severity; area: Area; title: string; detail: string; href: string; who?: string | null;
}

export const AREA_LABEL: Record<Area, string> = {
  prestamos: 'Préstamos', casos: 'Casos', clientes: 'Clientes', oportunidades: 'Oportunidades',
  presupuesto: 'Presupuesto', ventas: 'Ventas', equipo: 'Equipo', celebraciones: 'Celebraciones',
};

const SEV_ORDER: Record<Severity, number> = { alta: 0, media: 1, logro: 2, info: 3 };
const MAX_DISCOUNT = 20;
const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const plural = (n: number, a: string, b: string) => `${n} ${n === 1 ? a : b}`;

/** Señales que importan hoy, según lo que la persona puede ver. */
export async function buildAlerts(supabase: SupabaseClient, me: WholesaleMe): Promise<Alert[]> {
  const t = today();
  const has = (m: string) => me.modules.includes(m as never);
  const out: Alert[] = [];

  const [clientsR, repsR, salesR, loansR, casesR, oppsR, contactsR, touchesR, zbR, actsR, birthdaysR] = await Promise.all([
    supabase.from('wholesale_clients').select('id, name, zone, rep_id').is('deleted_at', null).eq('is_active', true),
    supabase.from('wholesale_reps').select('id, name').is('deleted_at', null).eq('is_active', true),
    supabase.from('wholesale_sales').select('client_id, sold_on, units, net_amount, discount_percent, invoice_number').is('deleted_at', null).gte('sold_on', addDays(t, -730)),
    has('prestamos') ? supabase.from('wholesale_loans').select('id, client_id, rep_id, due_on, loaned_on, units, serials').eq('status', 'active').is('deleted_at', null) : Promise.resolve({ data: [] }),
    has('casos') ? supabase.from('wholesale_cases').select('id, number, client_id, subject, priority, status, due_on, assigned_to, assigned_name, created_at').is('deleted_at', null).in('status', OPEN_STATUS) : Promise.resolve({ data: [] }),
    has('oportunidades') ? supabase.from('wholesale_opportunities').select('id, name, rep_id, stage, next_action, next_action_on, expected_close, est_amount, created_at, won_on').is('deleted_at', null) : Promise.resolve({ data: [] }),
    has('oportunidades') ? supabase.from('wholesale_opp_contacts').select('id, opportunity_id, name, influence') : Promise.resolve({ data: [] }),
    has('oportunidades') ? supabase.from('wholesale_interactions').select('opportunity_id, happened_on, contact_ids') : Promise.resolve({ data: [] }),
    has('presupuestos') ? supabase.from('wholesale_zone_budgets').select('zone, month, amount').eq('year', Number(t.slice(0, 4))) : Promise.resolve({ data: [] }),
    me.isCoordination ? supabase.from('wholesale_activities').select('rep_id, scheduled_on, status').is('deleted_at', null).gte('scheduled_on', addDays(t, -14)) : Promise.resolve({ data: [] }),
    has('celebraciones') ? supabase.from('wholesale_contacts').select('client_id, name, birth_month, birth_day').is('deleted_at', null).not('birth_month', 'is', null) : Promise.resolve({ data: [] }),
  ]);

  const clients = clientsR.data ?? [];
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const repName = new Map((repsR.data ?? []).map((r) => [r.id, r.name]));
  const mineOnly = me.role === 'rep';
  const myClients = new Set(clients.filter((c) => !mineOnly || c.rep_id === me.repId).map((c) => c.id));
  const sales = (salesR.data ?? []).filter((s) => myClients.has(s.client_id));
  const who = (repId: string | null | undefined) => (me.isCoordination && repId ? repName.get(repId) ?? null : null);

  // ---------------------------- Préstamos ----------------------------
  for (const l of (loansR.data ?? []) as { id: string; client_id: string; rep_id: string | null; due_on: string; loaned_on: string; units: number; serials: string[] }[]) {
    const left = Math.round((Date.parse(l.due_on) - Date.parse(t)) / 86_400_000);
    const out_ = daysSince(l.loaned_on) ?? 0;
    const name = clientName.get(l.client_id) ?? 'Cliente';
    const what = `${plural(l.units, 'equipo', 'equipos')} · ${l.serials.slice(0, 2).join(', ')}`;
    if (left < 0) out.push({ id: `loan-${l.id}`, sev: out_ > 30 ? 'alta' : 'media', area: 'prestamos', title: `Préstamo vencido hace ${-left} días en ${name}`, detail: `${what}. Recógelo, véndelo o dale más días.`, href: `/wholesale/clients/${l.client_id}`, who: who(l.rep_id) });
    else if (left <= 3) out.push({ id: `loan-${l.id}`, sev: 'info', area: 'prestamos', title: `Préstamo vence ${left === 0 ? 'hoy' : `en ${left} días`} en ${name}`, detail: `${what}. Pregunta si lo van a comprar.`, href: `/wholesale/clients/${l.client_id}`, who: who(l.rep_id) });
  }

  // ------------------------------ Casos ------------------------------
  for (const c of (casesR.data ?? []) as { id: string; number: number; client_id: string; subject: string; priority: string; due_on: string | null; assigned_to: string | null; assigned_name: string | null; created_at: string }[]) {
    const name = clientName.get(c.client_id) ?? 'Cliente';
    if (c.due_on && c.due_on < t) out.push({ id: `case-${c.id}`, sev: 'alta', area: 'casos', title: `Caso #${c.number} vencido: ${c.subject}`, detail: `${name} · ${c.assigned_name ?? 'sin responsable'}`, href: `/wholesale/casos/${c.id}` });
    else if (!c.assigned_to) out.push({ id: `case-${c.id}`, sev: c.priority === 'alta' ? 'alta' : 'media', area: 'casos', title: `Caso #${c.number} sin responsable${c.priority === 'alta' ? ' (urgente)' : ''}`, detail: `${name} · ${c.subject}`, href: `/wholesale/casos/${c.id}` });
    else if (c.assigned_to === me.id && c.due_on && c.due_on <= addDays(t, 1)) out.push({ id: `case-${c.id}`, sev: 'media', area: 'casos', title: `Tu caso #${c.number} vence ${c.due_on === t ? 'hoy' : 'mañana'}`, detail: `${name} · ${c.subject}`, href: `/wholesale/casos/${c.id}` });
  }

  // -------------------------- Oportunidades --------------------------
  const opps = (oppsR.data ?? []) as { id: string; name: string; rep_id: string | null; stage: string; next_action: string | null; next_action_on: string | null; expected_close: string | null; est_amount: number | null; created_at: string; won_on: string | null }[];
  const lastTouch = new Map<string, string>();
  const touched = new Set<string>();
  for (const i of (touchesR.data ?? []) as { opportunity_id: string; happened_on: string; contact_ids: string[] }[]) {
    if ((lastTouch.get(i.opportunity_id) ?? '') < i.happened_on) lastTouch.set(i.opportunity_id, i.happened_on);
    for (const c of i.contact_ids ?? []) touched.add(c);
  }
  for (const o of opps.filter((x) => OPEN_STAGES.includes(x.stage as never))) {
    const href = `/wholesale/oportunidades/${o.id}`;
    if (o.next_action_on && o.next_action_on < t) out.push({ id: `opp-next-${o.id}`, sev: 'alta', area: 'oportunidades', title: `Seguimiento vencido: ${o.name}`, detail: `${o.next_action ?? 'Seguimiento'} · era para el ${o.next_action_on}`, href, who: who(o.rep_id) });
    else if (o.next_action_on === t) out.push({ id: `opp-next-${o.id}`, sev: 'media', area: 'oportunidades', title: `Hoy: ${o.next_action ?? 'seguimiento'}`, detail: o.name, href, who: who(o.rep_id) });
    else if (!o.next_action_on) out.push({ id: `opp-none-${o.id}`, sev: 'media', area: 'oportunidades', title: `${o.name} no tiene próximo paso`, detail: 'Agenda qué sigue y para cuándo; sin fecha no avanza.', href, who: who(o.rep_id) });
    const silent = daysSince(lastTouch.get(o.id) ?? o.created_at) ?? 0;
    if (silent > 21) out.push({ id: `opp-cold-${o.id}`, sev: 'media', area: 'oportunidades', title: `${o.name} lleva ${silent} días sin contacto`, detail: 'Se está enfriando: una llamada o visita la reactiva.', href, who: who(o.rep_id) });
    if (o.expected_close && o.expected_close < t) out.push({ id: `opp-close-${o.id}`, sev: 'info', area: 'oportunidades', title: `${o.name} pasó su fecha de cierre (${o.expected_close})`, detail: 'Actualiza la fecha o la etapa.', href, who: who(o.rep_id) });
    if (['propuesta', 'negociacion'].includes(o.stage)) {
      const deciders = (contactsR.data ?? []).filter((c: { opportunity_id: string; influence: string }) => c.opportunity_id === o.id && c.influence === 'decide') as { id: string; name: string }[];
      for (const d of deciders.filter((d) => !touched.has(d.id))) out.push({ id: `opp-dec-${d.id}`, sev: 'alta', area: 'oportunidades', title: `Nadie ha hablado con ${d.name}, quien decide en ${o.name}`, detail: 'Está en propuesta o negociación: el cierre depende de esa conversación.', href, who: who(o.rep_id) });
    }
  }
  for (const o of opps.filter((x) => x.stage === 'ganado' && x.won_on && (daysSince(x.won_on) ?? 99) <= 7)) {
    out.push({ id: `opp-won-${o.id}`, sev: 'logro', area: 'oportunidades', title: `Se ganó ${o.name}`, detail: o.est_amount ? `${cop(Number(o.est_amount))} al año estimados` : 'Nueva cuenta', href: `/wholesale/oportunidades/${o.id}`, who: who(o.rep_id) });
  }

  // ----------------------------- Clientes ----------------------------
  if (has('clientes')) {
    const byClient = new Map<string, string[]>();
    for (const s of sales) byClient.set(s.client_id, [...(byClient.get(s.client_id) ?? []), s.sold_on]);
    const y90 = addDays(t, -90), py0 = addDays(t, -455), py1 = addDays(t, -365);
    for (const [cid, datesRaw] of byClient) {
      const dates = [...new Set(datesRaw)].sort();
      const name = clientName.get(cid) ?? 'Cliente';
      const c = clients.find((x) => x.id === cid);
      const last = dates.at(-1)!;
      const gap = daysSince(last) ?? 0;
      // Intervalo habitual entre compras, con al menos 3 compras para tener patrón
      if (dates.length >= 3) {
        const gaps = dates.slice(1).map((d, i) => (Date.parse(d) - Date.parse(dates[i])) / 86_400_000).sort((a, b) => a - b);
        const usual = gaps[Math.floor(gaps.length / 2)];
        if (gap > Math.max(45, usual * 1.5)) out.push({ id: `cli-gap-${cid}`, sev: gap > usual * 3 ? 'alta' : 'media', area: 'clientes', title: `${name} no compra hace ${gap} días`, detail: `Suele comprar cada ${Math.round(usual)} días. Llama antes de que se vaya con otro.`, href: `/wholesale/clients/${cid}`, who: who(c?.rep_id) });
      }
      // Caída fuerte frente al mismo periodo del año anterior
      const now90 = sales.filter((s) => s.client_id === cid && s.sold_on >= y90).reduce((a, s) => a + Number(s.net_amount ?? 0), 0);
      const prev90 = sales.filter((s) => s.client_id === cid && s.sold_on >= py0 && s.sold_on < py1).reduce((a, s) => a + Number(s.net_amount ?? 0), 0);
      if (prev90 > 0 && now90 < prev90 * 0.5 && gap <= Math.max(45, 90)) out.push({ id: `cli-drop-${cid}`, sev: 'media', area: 'clientes', title: `${name} compra ${Math.round((1 - now90 / prev90) * 100)}% menos que hace un año`, detail: `Últimos 90 días ${cop(now90)} frente a ${cop(prev90)} el año pasado.`, href: `/wholesale/clients/${cid}`, who: who(c?.rep_id) });
      if (dates.length === 1 && (daysSince(dates[0]) ?? 99) <= 14) out.push({ id: `cli-first-${cid}`, sev: 'logro', area: 'clientes', title: `${name} hizo su primera compra`, detail: 'Llama a agradecer y agenda la capacitación de su equipo.', href: `/wholesale/clients/${cid}`, who: who(c?.rep_id) });
    }
  }

  // ------------------------------ Ventas -----------------------------
  if (has('ventas')) {
    const month = t.slice(0, 7);
    const over = sales.filter((s) => s.sold_on.startsWith(month) && Number(s.discount_percent) > MAX_DISCOUNT);
    if (over.length) out.push({ id: `sales-disc-${month}`, sev: 'media', area: 'ventas', title: `${plural(over.length, 'venta', 'ventas')} este mes con descuento mayor al ${MAX_DISCOUNT}%`, detail: over.slice(0, 3).map((s) => `${clientName.get(s.client_id)} ${Number(s.discount_percent)}%`).join(' · '), href: '/wholesale/sales' });
  }

  // --------------------------- Presupuesto ---------------------------
  const zb = (zbR.data ?? []) as { zone: string; month: number; amount: number }[];
  if (zb.length) {
    const m = Number(t.slice(5, 7));
    const year = t.slice(0, 4);
    const zoneOf = new Map(clients.map((c) => [c.id, (c.zone ?? '').trim().toLowerCase()]));
    const zones = [...new Set(zb.map((z) => z.zone))];
    for (const zone of zones) {
      const budget = zb.filter((z) => z.zone === zone && z.month <= m).reduce((a, z) => a + Number(z.amount), 0);
      const sold = sales.filter((s) => s.sold_on.startsWith(year) && Number(s.sold_on.slice(5, 7)) <= m && zoneOf.get(s.client_id) === zone.toLowerCase())
        .reduce((a, s) => a + Number(s.net_amount ?? 0), 0);
      if (budget > 0 && sold / budget < 0.8 && Number(t.slice(8, 10)) >= 10) out.push({ id: `zone-${zone}`, sev: sold / budget < 0.6 ? 'alta' : 'media', area: 'presupuesto', title: `${zone} va al ${Math.round(sold / budget * 100)}% del presupuesto`, detail: `Faltan ${cop(budget - sold)} para estar al día a ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][m - 1]}.`, href: `/wholesale/budgets/zona/${encodeURIComponent(zone)}?year=${year}` });
    }
  }

  // ------------------------------ Equipo -----------------------------
  if (me.isCoordination) {
    const acts = (actsR.data ?? []) as { rep_id: string; scheduled_on: string; status: string }[];
    for (const r of repsR.data ?? []) {
      const done = acts.filter((a) => a.rep_id === r.id && a.status === 'done' && a.scheduled_on >= addDays(t, -7)).length;
      if (done === 0) out.push({ id: `rep-idle-${r.id}`, sev: 'media', area: 'equipo', title: `${r.name} no registró actividades en 7 días`, detail: 'Sin visitas, llamadas ni capacitaciones registradas.', href: `/wholesale/reps/${r.id}` });
    }
  }

  // --------------------------- Celebraciones -------------------------
  for (const b of (birthdaysR.data ?? []) as { client_id: string; name: string; birth_month: number; birth_day: number }[]) {
    if (!myClients.has(b.client_id)) continue;
    for (let k = 0; k <= 3; k++) {
      const d = addDays(t, k);
      if (Number(d.slice(5, 7)) === b.birth_month && Number(d.slice(8, 10)) === b.birth_day) {
        out.push({ id: `bday-${b.client_id}-${b.name}`, sev: 'info', area: 'celebraciones', title: `Cumpleaños de ${b.name} ${k === 0 ? 'hoy' : k === 1 ? 'mañana' : `en ${k} días`}`, detail: clientName.get(b.client_id) ?? '', href: '/wholesale/celebraciones' });
      }
    }
  }

  return out.sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev]);
}
