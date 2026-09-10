'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveWholesaleBudgets } from '@/app/actions/wholesale';
import { cop } from '@/lib/format';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export interface BudgetRow { month: number; amount: number; units: number }

function Ratio({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[var(--ink-soft)]">—</span>;
  return (
    <span className={value >= 1 ? 'wsale-good font-semibold' : value >= 0.8 ? 'wsale-warn' : 'wsale-bad'}>
      {Math.round(value * 100)}%
    </span>
  );
}

export function BudgetGrid({
  clientId, year, initial, actualByMonth,
}: {
  clientId: string;
  year: number;
  initial: BudgetRow[];
  actualByMonth: { amount: number; units: number }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<BudgetRow[]>(() =>
    Array.from({ length: 12 }, (_, i) => {
      const found = initial.find((r) => r.month === i + 1);
      return { month: i + 1, amount: found?.amount ?? 0, units: found?.units ?? 0 };
    }),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(month: number, key: 'amount' | 'units', raw: string) {
    setSaved(false);
    setRows((rs) => rs.map((r) => (r.month === month ? { ...r, [key]: Number(raw) || 0 } : r)));
  }

  /** Repite el valor del mes en curso hacia adelante — cargar 12 meses
   *  iguales a mano es el camino corto al error de digitación. */
  function fillDown(month: number) {
    setSaved(false);
    setRows((rs) => {
      const source = rs.find((r) => r.month === month)!;
      return rs.map((r) =>
        r.month > month ? { ...r, amount: source.amount, units: source.units } : r,
      );
    });
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await saveWholesaleBudgets(clientId, year, rows);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  const totalAmount = rows.reduce((a, r) => a + r.amount, 0);
  const totalUnits = rows.reduce((a, r) => a + r.units, 0);
  const actualAmount = actualByMonth.reduce((a, m) => a + m.amount, 0);
  const actualUnits = actualByMonth.reduce((a, m) => a + m.units, 0);

  return (
    <div className="wsale-panel overflow-x-auto">
      <table className="w-full text-sm min-w-[720px] border-collapse [&_th]:border [&_th]:border-[var(--rule)] [&_td]:border [&_td]:border-[var(--rule)]">
        <thead>
          <tr className="text-left">
            <th className="px-4 py-3 font-semibold" rowSpan={2}>Mes</th>
            <th className="px-3 py-2 font-semibold text-center" colSpan={2}>Presupuesto</th>
            <th className="px-3 py-2 font-semibold text-center" colSpan={2}>Real</th>
            <th className="px-3 py-2 font-semibold text-center" colSpan={2}>Cumplimiento</th>
            <th className="px-2 py-3" rowSpan={2} />
          </tr>
          <tr className="text-right text-xs">
            <th className="px-3 pb-2 font-medium">Valor</th>
            <th className="px-3 pb-2 font-medium">Und</th>
            <th className="px-3 pb-2 font-medium">Valor</th>
            <th className="px-3 pb-2 font-medium">Und</th>
            <th className="px-3 pb-2 font-medium">Valor</th>
            <th className="px-3 pb-2 font-medium">Und</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const actual = actualByMonth[r.month - 1] ?? { amount: 0, units: 0 };
            const ratio = r.amount > 0 ? actual.amount / r.amount : null;
            const unitRatio = r.units > 0 ? actual.units / r.units : null;
            return (
              <tr key={r.month} className="border-t border-[var(--rule)]">
                <td className="px-4 py-2 font-medium">{MONTHS[r.month - 1]}</td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={r.amount || ''}
                    placeholder="0"
                    onChange={(e) => update(r.month, 'amount', e.target.value)}
                    className="w-36 h-9 rounded-[2px] border border-[var(--rule)] px-2 outline-none focus:border-[var(--accent)]"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    value={r.units || ''}
                    placeholder="0"
                    onChange={(e) => update(r.month, 'units', e.target.value)}
                    className="w-20 h-9 rounded-[2px] border border-[var(--rule)] px-2 outline-none focus:border-[var(--accent)]"
                  />
                </td>
                <td className="px-3 py-2 text-right text-[var(--ink-soft)]">
                  {actual.amount > 0 ? cop(actual.amount) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-[var(--ink-soft)]">{actual.units || '—'}</td>
                <td className="px-3 py-2 text-right"><Ratio value={ratio} /></td>
                <td className="px-3 py-2 text-right"><Ratio value={unitRatio} /></td>
                <td className="px-2 py-2">
                  {r.month < 12 && (
                    <button
                      type="button"
                      onClick={() => fillDown(r.month)}
                      title="Copiar este valor a los meses siguientes"
                      className="text-[var(--ink-soft)] hover:text-[var(--accent)] text-xs px-2"
                    >
                      ↓
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="px-4 py-3">Total {year}</td>
            <td className="px-3 py-3 text-right">{cop(totalAmount)}</td>
            <td className="px-3 py-3 text-right">{totalUnits || '—'}</td>
            <td className="px-3 py-3 text-right">{cop(actualAmount)}</td>
            <td className="px-3 py-3 text-right">{actualUnits || '—'}</td>
            <td className="px-3 py-3 text-right">
              <Ratio value={totalAmount > 0 ? actualAmount / totalAmount : null} />
            </td>
            <td className="px-3 py-3 text-right">
              <Ratio value={totalUnits > 0 ? actualUnits / totalUnits : null} />
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      <div className="p-5 border-t border-[var(--rule)] flex items-center gap-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="wsale-btn"
        >
          {saving ? 'Guardando…' : 'Guardar presupuesto'}
        </button>
        {saved && <span className="wsale-good text-sm">Guardado ✓</span>}
        {error && <span className="wsale-bad text-sm">{error}</span>}
        <span className="text-[var(--ink-soft)] text-xs ml-auto">
          La flecha ↓ copia el valor del mes a los siguientes.
        </span>
      </div>
    </div>
  );
}
