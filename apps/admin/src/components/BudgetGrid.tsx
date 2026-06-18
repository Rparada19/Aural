'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { upsertBudget } from '@/app/actions/budgets';

interface Row { month: number; amount: number; sales: number }

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function BudgetGrid({ visitorId, year, budgets }: { visitorId: string; year: number; budgets: Row[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<number, string>>(
    Object.fromEntries(budgets.map((b) => [b.month, b.amount ? String(b.amount) : '']))
  );
  const [dirty, setDirty] = useState<Set<number>>(new Set());

  function setVal(month: number, v: string) {
    setValues((p) => ({ ...p, [month]: v }));
    setDirty((p) => new Set(p).add(month));
  }

  function saveAll() {
    startTransition(async () => {
      for (const month of dirty) {
        const amt = Number(values[month] ?? '0');
        await upsertBudget(visitorId, year, month, Number.isFinite(amt) ? amt : 0);
      }
      setDirty(new Set());
      router.refresh();
    });
  }

  const totalBudget = Object.values(values).reduce((s, v) => s + (Number(v) || 0), 0);
  const totalSales = budgets.reduce((s, b) => s + b.sales, 0);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {budgets.map((b) => {
          const budgetVal = Number(values[b.month] ?? '0') || 0;
          const pct = budgetVal > 0 ? Math.round((b.sales / budgetVal) * 100) : null;
          const accent = pct === null ? 'text-secondary' : pct >= 100 ? 'text-success' : pct >= 70 ? 'text-warning' : 'text-danger';
          return (
            <div key={b.month} className="border border-border rounded-lg p-3 bg-surface/40">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary">{MONTHS[b.month - 1]} {year}</span>
                <span className={`text-xs font-semibold ${accent}`}>{pct !== null ? `${pct}%` : '—'}</span>
              </div>
              <label className="block mt-2">
                <span className="text-[10px] uppercase tracking-wider text-secondary font-semibold">Presupuesto</span>
                <input
                  type="number" min="0" step="1"
                  value={values[b.month] ?? ''}
                  onChange={(e) => setVal(b.month, e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full h-10 rounded-md border border-border bg-white px-2 text-sm outline-none focus:border-primary"
                />
              </label>
              <p className="text-xs text-secondary mt-2">
                Ventas: <span className="font-semibold text-primary">{cop(b.sales)}</span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <div className="text-sm">
          <p className="text-secondary">Total presupuesto {year}: <span className="font-semibold text-primary">{cop(totalBudget)}</span></p>
          <p className="text-secondary">Total ventas {year}: <span className="font-semibold text-primary">{cop(totalSales)}</span></p>
        </div>
        <button
          onClick={saveAll}
          disabled={isPending || dirty.size === 0}
          className="px-5 h-11 rounded-md bg-primary text-white font-semibold disabled:opacity-40"
        >
          {isPending ? 'Guardando…' : `Guardar (${dirty.size})`}
        </button>
      </div>
    </div>
  );
}
