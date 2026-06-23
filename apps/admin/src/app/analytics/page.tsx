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

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  const sp = await searchParams;
  const now = new Date();
  const selYear = Number(sp.year) || now.getFullYear();
  const selMonth = sp.month ? Number(sp.month) : null; // null = todo el año

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const [{ data: patientsAll }, { data: techs }, { data: plats }, { data: profs }, { data: cities }, { data: audios }, { data: locs }] = await Promise.all([
    supabase.from('patients')
      .select('funnel_status, sale_closed, sale_closed_at, total_price, created_at, technology_id, platform_id, professional_id, city_id, case_type, audiologist_id, location_id, binaural')
      .is('deleted_at', null),
    supabase.from('technologies').select('id, name'),
    supabase.from('platforms').select('id, code'),
    supabase.from('profiles').select('id, full_name'),
    supabase.from('cities').select('id, name'),
    supabase.from('audiologists').select('id, name'),
    supabase.from('locations').select('id, name, city_id'),
  ]);

  const inPeriod = (p: any) => {
    const ref = p.sale_closed && p.sale_closed_at ? new Date(p.sale_closed_at) : new Date(p.created_at);
    if (ref.getFullYear() !== selYear) return false;
    if (selMonth !== null && ref.getMonth() + 1 !== selMonth) return false;
    return true;
  };
  const list = (patientsAll ?? []).filter(inPeriod);
  const techMap = new Map((techs ?? []).map((t) => [t.id, t.name]));
  const platMap = new Map((plats ?? []).map((p) => [p.id, p.code]));
  const profMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
  const cityMap = new Map((cities ?? []).map((c) => [c.id, c.name]));
  const audioMap = new Map((audios ?? []).map((a) => [a.id, a.name]));
  const locMap = new Map((locs ?? []).map((l) => [l.id, l.name]));
  const locCityMap = new Map((locs ?? []).map((l: any) => [l.id, l.city_id as string | null]));
  // Resolver ciudad efectiva del paciente: patient.city_id || location.city_id || city_text
  for (const p of list as any[]) {
    if (!p.city_id && p.location_id) {
      p.city_id = locCityMap.get(p.location_id) ?? null;
    }
  }

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
  const topAudio = byKey('audiologist_id', audioMap);

  // Desempeño por audióloga: pacientes asignados/cerrados, audífonos cotizados/vendidos, valores
  type Perf = { name: string; assigned: number; closed: number; aidsQuoted: number; aidsSold: number; quoted: number; sold: number };
  const aidsOf = (p: any) => (p.binaural ? 2 : 1);
  function perfByKey(key: 'audiologist_id' | 'location_id', resolver: Map<string, string>): Perf[] {
    const m = new Map<string, Perf>();
    for (const p of list) {
      const id = p[key];
      if (!id) continue;
      const name = resolver.get(id) ?? id;
      const cur = m.get(name) ?? { name, assigned: 0, closed: 0, aidsQuoted: 0, aidsSold: 0, quoted: 0, sold: 0 };
      cur.assigned += 1;
      if (p.total_price) cur.aidsQuoted += aidsOf(p);
      if (p.sale_closed) {
        cur.closed += 1;
        cur.sold += Number(p.total_price ?? 0);
        cur.aidsSold += aidsOf(p);
      } else if (p.total_price) {
        cur.quoted += Number(p.total_price ?? 0);
      }
      m.set(name, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.sold - a.sold || b.assigned - a.assigned);
  }
  const perfAudio = perfByKey('audiologist_id', audioMap);
  const perfLoc = perfByKey('location_id', locMap);

  // VENTAS POR MES (últimos 12)
  const monthly: { month: string; sold: number; quoted: number }[] = [];
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-primary">Analytics</h1>
          <p className="text-secondary mt-1">Insights operativos y comerciales.</p>
        </div>
        <PeriodSelector year={selYear} month={selMonth} />
      </div>

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
        <div className="bg-white border border-border rounded-2xl p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-primary mb-4">Top audiólogas (ventas cerradas)</h3>
          <TopList rows={topAudio} />
        </div>
      </section>

      <section className="mt-6 bg-white border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-1">Desempeño por audióloga</h3>
        <p className="text-secondary text-sm mb-4">Pacientes asignados, cerrados y valor cotizado vs cerrado.</p>
        <PerfTable rows={perfAudio} unitLabel="Audióloga" />
      </section>

      <section className="mt-6 bg-white border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-primary mb-1">Remisiones por sede</h3>
        <p className="text-secondary text-sm mb-4">Pacientes remitidos por sede vs ventas cerradas en esa sede.</p>
        <PerfTable rows={perfLoc} unitLabel="Sede" />
      </section>
    </DashboardLayout>
  );
}

function PerfTable({ rows, unitLabel }: { rows: { name: string; assigned: number; closed: number; aidsQuoted: number; aidsSold: number; quoted: number; sold: number }[]; unitLabel: string }) {
  if (rows.length === 0) return <p className="text-secondary text-sm">Sin datos aún.</p>;
  const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wider text-secondary border-b border-border">
          <tr>
            <th className="text-left font-semibold py-2 pr-3">{unitLabel}</th>
            <th className="text-right font-semibold py-2 px-3">Pacientes asignados</th>
            <th className="text-right font-semibold py-2 px-3">Pacientes cerrados</th>
            <th className="text-right font-semibold py-2 px-3">Conversión</th>
            <th className="text-right font-semibold py-2 px-3">Audífonos cotizados</th>
            <th className="text-right font-semibold py-2 px-3">Audífonos vendidos</th>
            <th className="text-right font-semibold py-2 px-3">$ Cotizado</th>
            <th className="text-right font-semibold py-2 pl-3">$ Cerrado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const conv = r.assigned > 0 ? Math.round((r.closed / r.assigned) * 100) : 0;
            return (
              <tr key={r.name}>
                <td className="py-2 pr-3 font-medium text-primary">{r.name}</td>
                <td className="py-2 px-3 text-right">{r.assigned}</td>
                <td className="py-2 px-3 text-right font-semibold text-success">{r.closed}</td>
                <td className={`py-2 px-3 text-right font-semibold ${conv >= 30 ? 'text-success' : conv >= 15 ? 'text-warning' : 'text-secondary'}`}>{conv}%</td>
                <td className="py-2 px-3 text-right">{r.aidsQuoted}</td>
                <td className="py-2 px-3 text-right font-semibold text-success">{r.aidsSold}</td>
                <td className="py-2 px-3 text-right text-warning">{fmt(r.quoted)}</td>
                <td className="py-2 pl-3 text-right font-semibold text-success">{fmt(r.sold)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function PeriodSelector({ year, month }: { year: number; month: number | null }) {
  const base = (y: number, m: number | null) => {
    const params = new URLSearchParams();
    params.set('year', String(y));
    if (m !== null) params.set('month', String(m));
    return `/analytics?${params.toString()}`;
  };
  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex items-center gap-2">
        <a href={base(year - 1, month)} className="px-3 h-9 rounded-md border border-border text-sm">← {year - 1}</a>
        <span className="px-3 h-9 inline-flex items-center font-semibold text-primary">{year}</span>
        <a href={base(year + 1, month)} className="px-3 h-9 rounded-md border border-border text-sm">{year + 1} →</a>
      </div>
      <div className="flex flex-wrap gap-1 justify-end">
        <a href={base(year, null)} className={`px-2 h-7 inline-flex items-center text-xs rounded ${month === null ? 'bg-primary text-white font-semibold' : 'border border-border text-secondary'}`}>Todo el año</a>
        {MONTH_NAMES.map((m, i) => (
          <a key={m} href={base(year, i + 1)} className={`px-2 h-7 inline-flex items-center text-xs rounded ${month === i + 1 ? 'bg-primary text-white font-semibold' : 'border border-border text-secondary'}`}>
            {m}
          </a>
        ))}
      </div>
    </div>
  );
}
