import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PrintButton } from '@/components/wholesale/PrintButton';
import { requireWholesaleMe, cop } from '@/lib/wholesale';
import { monthStart, monthEnd } from '@/lib/activities';

export const dynamic = 'force-dynamic';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default async function ExpenseSheet({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { id } = await params;
  const { year: yearParam, month: monthParam } = await searchParams;
  const me = await requireWholesaleMe();
  if (me.role === 'rep' && me.repId !== id) notFound();

  const now = new Date();
  const year = Number(yearParam) || now.getFullYear();
  const month = Number(monthParam) || now.getMonth() + 1;
  const from = monthStart(year, month);
  const to = monthEnd(year, month);
  const supabase = await createSupabaseServerClient();

  const [{ data: rep }, { data: expenses }, { data: cats }, { data: clients }] = await Promise.all([
    supabase.from('wholesale_reps').select('id, name, zone, email, phone')
      .eq('id', id).is('deleted_at', null).maybeSingle(),
    supabase.from('wholesale_expenses')
      .select('id, client_id, category, spent_on, amount, description')
      .eq('rep_id', id).is('deleted_at', null)
      .gte('spent_on', from).lte('spent_on', to)
      .order('spent_on'),
    supabase.from('wholesale_expense_categories').select('slug, label, sort_order').order('sort_order'),
    supabase.from('wholesale_clients').select('id, name').is('deleted_at', null),
  ]);

  if (!rep) notFound();

  const rows = expenses ?? [];
  const catLabel = new Map((cats ?? []).map((c) => [c.slug, c.label]));
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.name]));
  const total = rows.reduce((a, e) => a + Number(e.amount ?? 0), 0);

  // Resumen por rubro: es lo que contabilidad revisa primero
  const byCategory = (cats ?? [])
    .map((c) => ({
      label: c.label,
      total: rows.filter((e) => e.category === c.slug).reduce((a, e) => a + Number(e.amount ?? 0), 0),
      count: rows.filter((e) => e.category === c.slug).length,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.total - a.total);

  const consecutive = `AU-${year}${String(month).padStart(2, '0')}-${id.slice(0, 4).toUpperCase()}`;

  return (
    <main className="wsale min-h-screen" style={{ background: '#fff' }}>
      <div className="max-w-3xl mx-auto px-10 py-10">
        <div className="no-print flex items-center justify-between gap-4 mb-8">
          <Link href={`/wholesale/reps/${id}?month=${month}`} className="text-[13px] text-[var(--ink-soft)] hover:underline">
            ← Volver
          </Link>
          <div className="flex gap-1.5 items-center flex-wrap justify-end">
            {MONTHS.map((m, i) => (
              <Link
                key={m}
                href={`/wholesale/reps/${id}/gastos?year=${year}&month=${i + 1}`}
                className="wsale-chip"
                data-on={month === i + 1}
              >
                {m.slice(0, 3)}
              </Link>
            ))}
            <PrintButton label="Imprimir / PDF" />
          </div>
        </div>

        {/* Encabezado del documento */}
        <header className="flex items-start justify-between gap-8 pb-5 border-b-2 border-[var(--ink)]">
          <div>
            <Image
              src="/logo-aural.png"
              alt="Aural"
              width={4191}
              height={1432}
              className="w-[132px] h-auto"
              priority
            />
          </div>
          <div className="text-right">
            <h1 className="wsale-display text-[19px] leading-tight">Legalización de gastos</h1>
            <p className="text-[12px] text-[var(--ink-soft)] mt-1">Canal Wholesale</p>
            <p className="wsale-mono text-[10px] text-[var(--ink-faint)] mt-1.5">{consecutive}</p>
          </div>
        </header>

        {/* Datos de la legalización */}
        <section className="grid grid-cols-4 gap-x-6 gap-y-4 py-5 border-b border-[var(--rule)]">
          {[
            ['Colaborador', rep.name],
            ['Zona', rep.zone ?? '—'],
            ['Mes de legalización', `${MONTHS[month - 1]} ${year}`],
            ['Fecha de emisión', now.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="wsale-overline">{label}</p>
              <p className="text-[13px] mt-1.5">{value}</p>
            </div>
          ))}
        </section>

        {rows.length === 0 ? (
          <p className="text-[13px] text-[var(--ink-soft)] py-12 text-center">
            No hay gastos registrados en {MONTHS[month - 1]} de {year}.
          </p>
        ) : (
          <>
            {/* Detalle */}
            <section className="py-6">
              <table className="wsale-table">
                <thead>
                  <tr>
                    <th style={{ width: '90px' }}>Fecha</th>
                    <th style={{ width: '110px' }}>Rubro</th>
                    <th>Concepto</th>
                    <th>Cliente</th>
                    <th className="num" style={{ width: '110px' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id} className="print-row">
                      <td className="wsale-mono text-[11px] whitespace-nowrap">{e.spent_on}</td>
                      <td className="text-[12px]">{catLabel.get(e.category) ?? e.category}</td>
                      <td className="text-[12px]">{e.description ?? '—'}</td>
                      <td className="text-[12px] text-[var(--ink-soft)]">
                        {e.client_id ? clientName.get(e.client_id) ?? '—' : '—'}
                      </td>
                      <td className="num wsale-figure text-[13px]">{cop(Number(e.amount))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>
                      Total a legalizar · {rows.length} soporte{rows.length === 1 ? '' : 's'}
                    </td>
                    <td className="num wsale-figure text-[15px]">{cop(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </section>

            {/* Resumen por rubro */}
            <section className="pb-6 print-page">
              <h2 className="wsale-overline pb-2 border-b border-[var(--rule)]">Resumen por rubro</h2>
              <table className="wsale-table mt-1">
                <tbody>
                  {byCategory.map((c) => (
                    <tr key={c.label} className="print-row">
                      <td className="text-[12px]">{c.label}</td>
                      <td className="num text-[11px] text-[var(--ink-faint)]" style={{ width: '80px' }}>
                        {c.count}
                      </td>
                      <td className="num text-[11px] text-[var(--ink-faint)]" style={{ width: '70px' }}>
                        {((c.total / total) * 100).toFixed(0)}%
                      </td>
                      <td className="num wsale-figure text-[13px]" style={{ width: '120px' }}>
                        {cop(c.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}

        {/* Firmas */}
        <section className="grid grid-cols-3 gap-8 pt-14 print-page">
          {['Elaborado por', 'Revisado por', 'Aprobado por'].map((label, i) => (
            <div key={label}>
              <div className="border-t border-[var(--ink)] pt-2">
                <p className="wsale-overline">{label}</p>
                <p className="text-[12px] mt-1.5">
                  {i === 0 ? rep.name : i === 1 ? 'Coordinación Wholesale' : 'Recursos Humanos'}
                </p>
                <p className="text-[10px] text-[var(--ink-faint)] mt-4">C.C. / Fecha</p>
              </div>
            </div>
          ))}
        </section>

        <footer className="mt-10 pt-3 border-t border-[var(--rule)] flex justify-between text-[10px] text-[var(--ink-faint)]">
          <span>Aural · Canal Wholesale</span>
          <span className="wsale-mono">{consecutive}</span>
        </footer>
      </div>
    </main>
  );
}
