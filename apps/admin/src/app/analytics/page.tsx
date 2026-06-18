import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Funnel } from '@/components/charts/Funnel';
import { TopList } from '@/components/charts/TopList';
import { MonthlyChart } from '@/components/charts/MonthlyChart';
import { FUNNEL_STATUS_LABEL, type PatientFunnelStatus } from '@aural/shared';

export const dynamic = 'force-dynamic';

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const [{ data: patients }, { data: techs }, { data: plats }, { data: profs }, { data: cities }] = await Promise.all([
    supabase.from('patients')
      .select('funnel_status, sale_closed, total_price, created_at, technology_id, platform_id, professional_id, city_id, case_type')
      .is('deleted_at', null)
      .eq('case_type', 'sale_candidate'),
    supabase.from('technologies').select('id, name'),
    supabase.from('platforms').select('id, code'),
    supabase.from('profiles').select('id, full_name'),
    supabase.from('cities').select('id, name'),
  ]);

  const list = patients ?? [];
  const techMap = new Map((techs ?? []).map((t) => [t.id, t.name]));
  const platMap = new Map((plats ?? []).map((p) => [p.id, p.code]));
  const profMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
  const cityMap = new Map((cities ?? []).map((c) => [c.id, c.name]));

  // EMBUDO
  const funnelOrder: PatientFunnelStatus[] = [
    'registered', 'contacted', 'appointment_scheduled', 'attended',
    'quoted', 'followup', 'sale_closed',
  ];
  const funnelCounts = funnelOrder.map((s) => ({
    label: FUNNEL_STATUS_LABEL[s],
    count: list.filter((p) => p.funnel_status === s).length,
  }));
  const lostCount = list.filter((p) => p.funnel_status === 'sale_lost').length;

  // TOPS (solo ventas cerradas)
  const closed = list.filter((p) => p.sale_closed);
  const byKey = (key: 'technology_id' | 'platform_id' | 'professional_id' | 'city_id', resolver: Map<string, string>) => {
    const tally = new Map<string, { count: number; amount: number }>();
    for (const p of closed) {
      const id = p[key];
      if (!id) continue;
      const name = resolver.get(id) ?? id;
      const cur = tally.get(name) ?? { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += Number(p.total_price ?? 0);
      tally.set(name, cur);
    }
    return Array.from(tally.entries())
      .map(([name, v]) => ({ name, count: v.count, amountRaw: v.amount, amountFormatted: cop(v.amount) }))
      .sort((a, b) => b.amountRaw - a.amountRaw)
      .slice(0, 10);
  };

  const topTech = byKey('technology_id', techMap);
  const topPlat = byKey('platform_id', platMap);
  const topProf = byKey('professional_id', profMap);
  const topCity = byKey('city_id', cityMap);

  // VENTAS POR MES (últimos 12)
  const monthly: { month: string; sold: number; quoted: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
    let sold = 0; let quoted = 0;
    for (const p of list) {
      const cd = new Date(p.created_at);
      const ck = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}`;
      if (ck !== key) continue;
      if (p.sale_closed) sold += Number(p.total_price ?? 0);
      else if (p.total_price) quoted += Number(p.total_price ?? 0);
    }
    monthly.push({ month: label, sold, quoted });
  }

  return (
    <DashboardLayout userName={me.full_name}>
      <h1 className="text-3xl font-bold text-primary">Analytics</h1>
      <p className="text-secondary mt-1">Insights operativos y comerciales.</p>

      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Embudo comercial</h3>
          <Funnel stages={funnelCounts} lost={lostCount} />
        </div>
        <div className="bg-white border border-border rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Ventas mensuales</h3>
          <MonthlyChart data={monthly} />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-border rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Top tecnologías</h3>
          <TopList rows={topTech} />
        </div>
        <div className="bg-white border border-border rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Top plataformas</h3>
          <TopList rows={topPlat} />
        </div>
        <div className="bg-white border border-border rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Top profesionales</h3>
          <TopList rows={topProf} />
        </div>
        <div className="bg-white border border-border rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Top ciudades</h3>
          <TopList rows={topCity} />
        </div>
      </section>
    </DashboardLayout>
  );
}
