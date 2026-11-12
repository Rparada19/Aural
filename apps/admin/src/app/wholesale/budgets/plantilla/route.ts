import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getWholesaleMe } from '@/lib/wholesale';
import { buildTemplate, type ZoneMonth } from '@/lib/budget-excel';

export const dynamic = 'force-dynamic';

const SIN_ZONA = 'Sin zona';

export async function GET(req: Request) {
  const me = await getWholesaleMe();
  if (!me?.isCoordination) return new Response('Solo coordinación', { status: 403 });
  const year = Number(new URL(req.url).searchParams.get('year')) || new Date().getFullYear() + 1;
  const supabase = await createSupabaseServerClient();

  const [{ data: clients }, { data: sales }, { data: saved }] = await Promise.all([
    supabase.from('wholesale_clients').select('id, zone').is('deleted_at', null),
    supabase.from('wholesale_sales').select('client_id, sold_on, units, net_amount').is('deleted_at', null)
      .gte('sold_on', `${year - 1}-01-01`).lte('sold_on', `${year - 1}-12-31`),
    supabase.from('wholesale_zone_budgets').select('zone, month, prev_units, prev_amount, units, amount, cost').eq('year', year),
  ]);

  const zoneOf = new Map((clients ?? []).map((c) => [c.id, c.zone?.trim() || SIN_ZONA]));
  const zones = new Set<string>([...zoneOf.values(), ...(saved ?? []).map((s) => s.zone)]);
  const prev = new Map<string, { units: number; amount: number }>();
  for (const s of sales ?? []) {
    const k = `${zoneOf.get(s.client_id) ?? SIN_ZONA}|${Number(s.sold_on.slice(5, 7))}`;
    const p = prev.get(k) ?? { units: 0, amount: 0 };
    prev.set(k, { units: p.units + Number(s.units ?? 0), amount: p.amount + Number(s.net_amount ?? 0) });
  }

  const rows: ZoneMonth[] = [];
  for (const zone of [...zones].sort((a, b) => (a === SIN_ZONA ? 1 : b === SIN_ZONA ? -1 : a.localeCompare(b)))) {
    for (let m = 1; m <= 12; m++) {
      const s = (saved ?? []).find((x) => x.zone === zone && x.month === m);
      const p = prev.get(`${zone}|${m}`);
      rows.push({
        zone, month: m,
        prev_units: s?.prev_units ?? p?.units ?? 0, prev_amount: Number(s?.prev_amount ?? p?.amount ?? 0),
        units: s?.units ?? 0, amount: Number(s?.amount ?? 0), cost: Number(s?.cost ?? 0),
      });
    }
  }

  const buf = await buildTemplate(year, rows);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="presupuesto-wholesale-${year}.xlsx"`,
    },
  });
}
