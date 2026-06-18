import { supabase } from '../../lib/supabase';

export interface VisitorStats {
  doctorsCount: number;
  patientsCount: number;
  salesClosed: number;
  amountSold: number;
  amountQuoted: number;
  opportunitiesCount: number;
  opportunitiesAmount: number;
  monthSales: number;
  monthBudget: number;
  achievement: number | null;
}

export async function getVisitorStats(linkedVisitorId: string): Promise<VisitorStats> {
  const empty: VisitorStats = {
    doctorsCount: 0, patientsCount: 0, salesClosed: 0,
    amountSold: 0, amountQuoted: 0,
    opportunitiesCount: 0, opportunitiesAmount: 0,
    monthSales: 0, monthBudget: 0, achievement: null,
  };
  if (!linkedVisitorId) return empty;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [{ data: docs }, { data: budget }] = await Promise.all([
    supabase.from('profiles').select('id').eq('visitor_id', linkedVisitorId).eq('status', 'approved'),
    supabase.from('visitor_budgets').select('amount').eq('visitor_id', linkedVisitorId).eq('year', year).eq('month', month).maybeSingle(),
  ]);
  const docIds = (docs ?? []).map((d) => d.id);
  if (docIds.length === 0) return empty;

  const { data: patients } = await supabase
    .from('patients')
    .select('id, sale_closed, sale_closed_at, total_price, is_opportunity, case_type')
    .in('professional_id', docIds)
    .is('deleted_at', null);

  const all = patients ?? [];
  const candidates = all.filter((p) => p.case_type === 'sale_candidate');
  const closed = candidates.filter((p) => p.sale_closed);
  const opportunities = candidates.filter((p) => p.is_opportunity && !p.sale_closed && p.total_price);

  const monthStart = new Date(year, month - 1, 1);
  const monthSales = closed
    .filter((p) => p.sale_closed_at && new Date(p.sale_closed_at) >= monthStart)
    .reduce((s, p) => s + Number(p.total_price ?? 0), 0);
  const amountSold = closed.reduce((s, p) => s + Number(p.total_price ?? 0), 0);
  const amountQuoted = candidates
    .filter((p) => !p.sale_closed && p.total_price)
    .reduce((s, p) => s + Number(p.total_price ?? 0), 0);
  const opportunitiesAmount = opportunities.reduce((s, p) => s + Number(p.total_price ?? 0), 0);
  const monthBudget = budget?.amount ? Number(budget.amount) : 0;
  const achievement = monthBudget > 0 ? Math.round((monthSales / monthBudget) * 100) : null;

  return {
    doctorsCount: docIds.length,
    patientsCount: all.length,
    salesClosed: closed.length,
    amountSold,
    amountQuoted,
    opportunitiesCount: opportunities.length,
    opportunitiesAmount,
    monthSales,
    monthBudget,
    achievement,
  };
}

export async function listMyDoctors(linkedVisitorId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, city, status')
    .eq('visitor_id', linkedVisitorId)
    .order('full_name');
  if (error) throw error;
  return data ?? [];
}
