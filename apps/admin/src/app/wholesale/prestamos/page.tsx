import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { MetricCard } from '@/components/wholesale/MetricCard';
import { Loans } from '@/components/wholesale/Loans';
import { requireWholesaleMe } from '@/lib/wholesale';
import { daysLeft, LOAN_DAYS, type Loan } from '@/lib/loans';

export const dynamic = 'force-dynamic';

export default async function LoansPage({ searchParams }: { searchParams: Promise<{ rep?: string }> }) {
  const sp = await searchParams;
  const me = await requireWholesaleMe('prestamos');
  const supabase = await createSupabaseServerClient();
  const year = new Date().getFullYear();

  let loanQ = supabase.from('wholesale_loans')
    .select('id, client_id, rep_id, loaned_on, due_on, returned_on, platform, tech_level, style, units, binaural, rechargeable, serials, patient_name, notes, status')
    .is('deleted_at', null).order('due_on');
  if (sp.rep) loanQ = loanQ.eq('rep_id', sp.rep);
  let clientQ = supabase.from('wholesale_clients').select('id, name').is('deleted_at', null).order('name');
  if (me.role === 'rep' && me.repId) clientQ = clientQ.eq('rep_id', me.repId);

  const [{ data: loans }, { data: clients }, { data: reps }, { data: platforms }, { data: techLevels }, { data: pStyles }] = await Promise.all([
    loanQ, clientQ,
    supabase.from('wholesale_reps').select('id, name').is('deleted_at', null).eq('is_active', true).order('name'),
    supabase.from('wholesale_platforms').select('slug, label').eq('is_active', true).order('sort_order'),
    supabase.from('wholesale_tech_levels').select('slug, label').eq('is_active', true).order('sort_order'),
    supabase.from('wholesale_product_styles').select('slug, label').eq('is_active', true).order('sort_order'),
  ]);

  const all = (loans ?? []) as Loan[];
  const active = all.filter((l) => l.status === 'active');
  const units = active.reduce((a, l) => a + l.units, 0);
  const late = active.filter((l) => daysLeft(l.due_on) < 0);
  const soon = active.filter((l) => daysLeft(l.due_on) >= 0 && daysLeft(l.due_on) <= 3);
  const closedYear = all.filter((l) => l.status !== 'active' && (l.returned_on ?? '').startsWith(String(year)));
  const sold = closedYear.filter((l) => l.status === 'sold').length;
  const conversion = closedYear.length ? Math.round(sold / closedYear.length * 100) : null;

  const byRep = (reps ?? []).map((r) => {
    const mine = active.filter((l) => l.rep_id === r.id);
    return { ...r, n: mine.reduce((a, l) => a + l.units, 0), late: mine.filter((l) => daysLeft(l.due_on) < 0).length };
  }).filter((r) => r.n > 0);

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline="Wholesale · Préstamos"
        title="Equipos de prueba"
        subtitle={`Audífonos prestados a los centros para que los prueben sus pacientes. Plazo de ${LOAN_DAYS} días: al vencer, el centro lo devuelve, lo compra o se le dan más días.`}
      />

      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard label="Equipos en los centros" value={String(units)} hint={`${active.length} préstamo${active.length === 1 ? '' : 's'} activo${active.length === 1 ? '' : 's'}`} />
        <MetricCard label="Vencidos" value={String(late.length)} hint="Hay que recogerlos o venderlos" tone={late.length ? 'alert' : 'success'} />
        <MetricCard label="Vencen en 3 días" value={String(soon.length)} tone={soon.length ? 'warning' : 'neutral'} />
        <MetricCard label={`Se volvieron venta ${year}`} value={conversion === null ? '—' : `${conversion}%`} hint={`${sold} de ${closedYear.length} cerrados`} tone={conversion !== null && conversion >= 50 ? 'success' : 'neutral'} />
      </section>

      {me.isCoordination && byRep.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <Link href="/wholesale/prestamos" className="wsale-chip" data-on={!sp.rep}>Todos</Link>
          {byRep.map((r) => (
            <Link key={r.id} href={`/wholesale/prestamos?rep=${r.id}`} className="wsale-chip" data-on={sp.rep === r.id}>
              {r.name} · {r.n}{r.late ? ` (${r.late} vencido${r.late === 1 ? '' : 's'})` : ''}
            </Link>
          ))}
        </div>
      )}

      <section className="wsale-panel p-6">
        <Loans
          loans={all}
          clients={clients ?? []}
          catalogs={{ platforms: platforms ?? [], techLevels: techLevels ?? [], styles: pStyles ?? [] }}
          canCreate
          showClient
        />
      </section>
    </WholesaleLayout>
  );
}
