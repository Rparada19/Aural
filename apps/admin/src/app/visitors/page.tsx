import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic';

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default async function VisitorsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  const [{ data: visitors }, { data: profiles }, { data: patients }, { data: budgets }] = await Promise.all([
    supabase.from('visitors').select('*').eq('is_active', true).order('name'),
    supabase.from('profiles').select('id, full_name, visitor_id, status'),
    supabase
      .from('patients')
      .select('professional_id, sale_closed, sale_closed_at, total_price, case_type')
      .is('deleted_at', null),
    supabase.from('visitor_budgets').select('visitor_id, amount').eq('year', curYear).eq('month', curMonth),
  ]);

  const budgetByVisitor = new Map((budgets ?? []).map((b) => [b.visitor_id, Number(b.amount)]));

  const proByVisitor = new Map<string, string[]>();
  for (const p of profiles ?? []) {
    if (!p.visitor_id) continue;
    if (!proByVisitor.has(p.visitor_id)) proByVisitor.set(p.visitor_id, []);
    proByVisitor.get(p.visitor_id)!.push(p.id);
  }

  // Ventas mensuales de este mes por profesional
  const monthStart = new Date(curYear, curMonth - 1, 1);

  const salesByPro = new Map<string, number>();
  const totalSalesByPro = new Map<string, number>();
  for (const p of patients ?? []) {
    if (!p.sale_closed || !p.total_price) continue;
    const amt = Number(p.total_price);
    totalSalesByPro.set(p.professional_id, (totalSalesByPro.get(p.professional_id) ?? 0) + amt);
    if (p.sale_closed_at && new Date(p.sale_closed_at) >= monthStart) {
      salesByPro.set(p.professional_id, (salesByPro.get(p.professional_id) ?? 0) + amt);
    }
  }

  const rows = (visitors ?? []).map((v: any) => {
    const proIds = proByVisitor.get(v.id) ?? [];
    const monthSales = proIds.reduce((s, id) => s + (salesByPro.get(id) ?? 0), 0);
    const totalSales = proIds.reduce((s, id) => s + (totalSalesByPro.get(id) ?? 0), 0);
    const budget = budgetByVisitor.get(v.id) ?? (v.monthly_budget ? Number(v.monthly_budget) : 0);
    const achievement = budget > 0 ? Math.round((monthSales / budget) * 100) : null;
    return {
      ...v,
      proCount: proIds.length,
      monthSales,
      totalSales,
      budget,
      achievement,
    };
  });

  return (
    <DashboardLayout userName={me.full_name}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Visitadores</h1>
          <p className="text-secondary mt-1">Métricas mensuales de cada visitador médico.</p>
        </div>
        <Link href="/catalogs" className="text-sm text-primary hover:underline">Editar catálogo →</Link>
      </div>

      <div className="bg-white border border-border rounded-2xl overflow-hidden mt-8">
        <table className="w-full text-sm">
          <thead className="bg-surface text-secondary text-xs uppercase tracking-wider">
            <tr>
              <Th>Visitador</Th>
              <Th>Contacto</Th>
              <Th className="text-right">Médicos</Th>
              <Th className="text-right">Ventas del mes</Th>
              <Th className="text-right">Presupuesto</Th>
              <Th className="text-right">Cumpl.</Th>
              <Th className="text-right">Ventas totales</Th>
              <Th className="text-right pr-6">Ficha</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((v) => (
              <tr key={v.id} className="hover:bg-surface/60">
                <Td className="font-medium">
                  <Link href={`/visitors/${v.id}`} className="text-primary hover:underline">{v.name}</Link>
                  <br /><span className="text-xs text-secondary">{v.city ?? ''}</span>
                </Td>
                <Td className="text-xs text-secondary">
                  {v.phone ?? '—'}
                  {v.email && <><br />{v.email}</>}
                </Td>
                <Td className="text-right">{v.proCount}</Td>
                <Td className="text-right font-semibold">{cop(v.monthSales)}</Td>
                <Td className="text-right">{v.budget ? cop(v.budget) : '—'}</Td>
                <Td className="text-right">
                  {v.achievement !== null ? (
                    <span className={`font-semibold ${v.achievement >= 100 ? 'text-success' : v.achievement >= 70 ? 'text-warning' : 'text-danger'}`}>
                      {v.achievement}%
                    </span>
                  ) : '—'}
                </Td>
                <Td className="text-right">{cop(v.totalSales)}</Td>
                <Td className="text-right pr-6">
                  <Link href={`/visitors/${v.id}`} className="text-primary text-xs font-semibold hover:underline">Abrir →</Link>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-secondary">Sin visitadores. Créalos en Catálogos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-semibold px-6 py-3 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-4 text-foreground ${className}`}>{children}</td>;
}
