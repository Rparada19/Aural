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

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface text-secondary">
          <tr className="text-left">
            <th className="px-5 py-3 font-semibold">Mes</th>
            <th className="px-5 py-3 font-semibold">Presupuesto</th>
            <th className="px-5 py-3 font-semibold">Unidades</th>
            <th className="px-5 py-3 font-semibold text-right">Real</th>
            <th className="px-5 py-3 font-semibold text-right">Cumpl.</th>
            <th className="px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const actual = actualByMonth[r.month - 1] ?? { amount: 0, units: 0 };
            const ratio = r.amount > 0 ? actual.amount / r.amount : null;
            return (
              <tr key={r.month} className="border-t border-border">
                <td className="px-5 py-2 font-medium">{MONTHS[r.month - 1]}</td>
                <td className="px-5 py-2">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={r.amount || ''}
                    placeholder="0"
                    onChange={(e) => update(r.month, 'amount', e.target.value)}
                    className="w-40 h-9 rounded-md border border-border px-2 outline-none focus:border-primary"
                  />
                </td>
                <td className="px-5 py-2">
                  <input
                    type="number"
                    min="0"
                    value={r.units || ''}
                    placeholder="0"
                    onChange={(e) => update(r.month, 'units', e.target.value)}
                    className="w-24 h-9 rounded-md border border-border px-2 outline-none focus:border-primary"
                  />
                </td>
                <td className="px-5 py-2 text-right text-secondary">
                  {actual.amount > 0 ? cop(actual.amount) : '—'}
                </td>
                <td className="px-5 py-2 text-right">
                  {ratio === null ? (
                    <span className="text-secondary">—</span>
                  ) : (
                    <span className={ratio >= 1 ? 'text-success font-semibold' : ratio >= 0.8 ? 'text-warning' : 'text-danger'}>
                      {Math.round(ratio * 100)}%
                    </span>
                  )}
                </td>
                <td className="px-2 py-2">
                  {r.month < 12 && (
                    <button
                      type="button"
                      onClick={() => fillDown(r.month)}
                      title="Copiar este valor a los meses siguientes"
                      className="text-secondary hover:text-primary text-xs px-2"
                    >
                      ↓
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-surface">
          <tr className="font-semibold">
            <td className="px-5 py-3">Total {year}</td>
            <td className="px-5 py-3">{cop(totalAmount)}</td>
            <td className="px-5 py-3">{totalUnits} und</td>
            <td className="px-5 py-3 text-right">{cop(actualAmount)}</td>
            <td className="px-5 py-3 text-right">
              {totalAmount > 0 ? `${Math.round((actualAmount / totalAmount) * 100)}%` : '—'}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      <div className="p-5 border-t border-border flex items-center gap-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="h-11 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-50 transition"
        >
          {saving ? 'Guardando…' : 'Guardar presupuesto'}
        </button>
        {saved && <span className="text-success text-sm">Guardado ✓</span>}
        {error && <span className="text-danger text-sm">{error}</span>}
        <span className="text-secondary text-xs ml-auto">
          La flecha ↓ copia el valor del mes a los siguientes.
        </span>
      </div>
    </div>
  );
}
