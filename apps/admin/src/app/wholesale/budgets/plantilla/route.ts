import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getWholesaleMe } from '@/lib/wholesale';
import { buildTemplate } from '@/lib/budget-excel';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const me = await getWholesaleMe();
  if (!me?.isCoordination) return new Response('Solo coordinación', { status: 403 });
  const year = Number(new URL(req.url).searchParams.get('year')) || new Date().getFullYear() + 1;
  const supabase = await createSupabaseServerClient();

  const [{ data: clients }, { data: reps }, { data: budgets }] = await Promise.all([
    supabase.from('wholesale_clients').select('id, name, nit, zone, rep_id').is('deleted_at', null).eq('is_active', true),
    supabase.from('wholesale_reps').select('id, name'),
    supabase.from('wholesale_budgets').select('client_id, month, amount, units').eq('year', year),
  ]);
  const rep = new Map((reps ?? []).map((r) => [r.id, r.name]));
  const list = (clients ?? [])
    .map((c) => {
      const mine = (budgets ?? []).filter((b) => b.client_id === c.id);
      return {
        id: c.id, name: c.name, nit: c.nit, zone: c.zone, rep: c.rep_id ? rep.get(c.rep_id) ?? null : null,
        amounts: Array.from({ length: 12 }, (_, k) => Number(mine.find((b) => b.month === k + 1)?.amount ?? 0)),
        units: Array.from({ length: 12 }, (_, k) => Number(mine.find((b) => b.month === k + 1)?.units ?? 0)),
      };
    })
    .sort((a, b) => (a.zone ?? 'zzz').localeCompare(b.zone ?? 'zzz') || a.name.localeCompare(b.name));

  const buf = await buildTemplate(year, list);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="presupuesto-wholesale-${year}.xlsx"`,
    },
  });
}
