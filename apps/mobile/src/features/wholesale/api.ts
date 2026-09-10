import { supabase } from '../../lib/supabase';

/** Rango del mes en curso, cerrado en su último día real. */
function monthRange(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${last}`, year: y, month: m };
}

export interface ChannelSummary {
  revenue: number;
  units: number;
  count: number;
  budget: number;
  asp: number;
  binauralRate: number;
  rechargeableRate: number;
  clients: number;
  topClients: { id: string; name: string; amount: number }[];
  overdueLoans: { id: string; client: string; serials: string[]; dueOn: string; days: number }[];
  noPurchase: { id: string; name: string; lastSale: string | null }[];
}

export async function fetchChannelSummary(): Promise<ChannelSummary> {
  const { from, to, year, month } = monthRange();

  const [clientsRes, salesRes, budgetsRes, loansRes] = await Promise.all([
    supabase.from('wholesale_clients').select('id, name').is('deleted_at', null).eq('is_active', true),
    supabase.from('wholesale_sales')
      .select('client_id, sold_on, units, binaural, rechargeable, net_amount')
      .is('deleted_at', null),
    supabase.from('wholesale_budgets').select('amount').eq('year', year).eq('month', month),
    supabase.from('wholesale_loans')
      .select('id, client_id, due_on, serials')
      .eq('status', 'active').is('deleted_at', null).order('due_on'),
  ]);

  const clients = clientsRes.data ?? [];
  const nameById = new Map(clients.map((c) => [c.id, c.name]));
  const allSales = salesRes.data ?? [];
  const monthSales = allSales.filter((s) => s.sold_on >= from && s.sold_on <= to);

  const revenue = monthSales.reduce((a, s) => a + Number(s.net_amount ?? 0), 0);
  const units = monthSales.reduce((a, s) => a + Number(s.units ?? 0), 0);
  const binaural = monthSales.filter((s) => s.binaural).length;
  const recharge = monthSales.filter((s) => s.rechargeable).length;
  const budget = (budgetsRes.data ?? []).reduce((a, b) => a + Number(b.amount ?? 0), 0);

  const byClient = new Map<string, number>();
  for (const s of monthSales) {
    byClient.set(s.client_id, (byClient.get(s.client_id) ?? 0) + Number(s.net_amount ?? 0));
  }
  const topClients = [...byClient.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, amount]) => ({ id, name: nameById.get(id) ?? 'Cliente', amount }));

  const today = new Date().toISOString().slice(0, 10);
  const overdueLoans = (loansRes.data ?? [])
    .filter((l) => l.due_on < today)
    .map((l) => ({
      id: l.id,
      client: nameById.get(l.client_id) ?? 'Cliente',
      serials: (l.serials ?? []) as string[],
      dueOn: l.due_on,
      days: Math.round((Date.parse(today) - Date.parse(l.due_on)) / 86_400_000),
    }));

  const bought = new Set(monthSales.map((s) => s.client_id));
  const lastByClient = new Map<string, string>();
  for (const s of allSales) {
    const prev = lastByClient.get(s.client_id);
    if (!prev || s.sold_on > prev) lastByClient.set(s.client_id, s.sold_on);
  }
  const noPurchase = clients
    .filter((c) => !bought.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, lastSale: lastByClient.get(c.id) ?? null }));

  return {
    revenue, units, count: monthSales.length, budget,
    asp: units > 0 ? revenue / units : 0,
    binauralRate: monthSales.length > 0 ? binaural / monthSales.length : 0,
    rechargeableRate: monthSales.length > 0 ? recharge / monthSales.length : 0,
    clients: clients.length,
    topClients, overdueLoans, noPurchase,
  };
}
