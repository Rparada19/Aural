'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createExpense, deleteExpense } from '@/app/actions/wholesale';
import { cop } from '@/lib/format';

export interface ExpenseCategory {
  slug: string;
  label: string;
  icon: string;
  is_active: boolean;
}

export interface Expense {
  id: string;
  client_id: string | null;
  category: string;
  spent_on: string;
  amount: number | string;
  description: string | null;
}

export function Expenses({
  repId, expenses, categories, clients, monthLabel, defaultDate,
}: {
  repId: string;
  expenses: Expense[];
  categories: ExpenseCategory[];
  clients: { id: string; name: string }[];
  monthLabel: string;
  defaultDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));

  const total = expenses.reduce((a, e) => a + Number(e.amount), 0);

  // Cuánto se invirtió en cada cliente este mes.
  const byClient = new Map<string, number>();
  for (const e of expenses) {
    const key = e.client_id ?? '__none__';
    byClient.set(key, (byClient.get(key) ?? 0) + Number(e.amount));
  }
  const ranked = [...byClient.entries()].sort((a, b) => b[1] - a[1]);

  async function remove(id: string) {
    setBusy(id);
    try {
      await deleteExpense(id, repId);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div>
          <h2 className="font-semibold">Gastos de {monthLabel}</h2>
          <p className="text-secondary text-xs mt-1">
            Cada gasto se imputa al cliente con el que se hizo.
          </p>
        </div>
        <p className="text-lg font-semibold">{cop(total)}</p>
      </div>

      {ranked.length > 0 && (
        <ul className="space-y-2 mb-5">
          {ranked.map(([key, amount]) => (
            <li key={key} className="flex items-center gap-3 text-sm">
              <span className="flex-1 truncate">
                {key === '__none__'
                  ? <span className="text-secondary">Sin cliente asignado</span>
                  : clientName.get(key) ?? 'Cliente'}
              </span>
              <div className="w-28 h-2 rounded-full bg-surface overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(amount / ranked[0][1]) * 100}%` }} />
              </div>
              <span className="w-28 text-right font-medium">{cop(amount)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        {expenses.length === 0 && (
          <p className="text-secondary text-sm">Sin gastos cargados este mes.</p>
        )}
        {expenses.map((e) => {
          const cat = catBySlug.get(e.category);
          return (
            <div key={e.id} className="flex items-start gap-3 border border-border rounded-lg p-3 text-sm">
              <span aria-hidden title={cat?.label}>{cat?.icon ?? '💸'}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate">
                  {e.description || cat?.label || 'Gasto'}
                </p>
                <p className="text-secondary text-xs">
                  {e.spent_on}
                  {e.client_id && ` · ${clientName.get(e.client_id) ?? 'Cliente'}`}
                </p>
              </div>
              <span className="font-semibold whitespace-nowrap">{cop(Number(e.amount))}</span>
              <button
                onClick={() => remove(e.id)}
                disabled={busy === e.id}
                className="text-secondary hover:text-danger text-xs disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        {open ? (
          <NewExpense
            repId={repId}
            categories={categories.filter((c) => c.is_active)}
            clients={clients}
            defaultDate={defaultDate}
            onDone={() => { setOpen(false); router.refresh(); }}
            onCancel={() => setOpen(false)}
          />
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="w-full h-11 rounded-lg border border-dashed border-border text-secondary text-sm hover:border-primary hover:text-primary transition"
          >
            + Cargar gasto
          </button>
        )}
      </div>
    </div>
  );
}

function NewExpense({
  repId, categories, clients, defaultDate, onDone, onCancel,
}: {
  repId: string;
  categories: ExpenseCategory[];
  clients: { id: string; name: string }[];
  defaultDate: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    category: categories[0]?.slug ?? '',
    client_id: '',
    spent_on: defaultDate,
    amount: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createExpense({
        rep_id: repId,
        client_id: form.client_id || null,
        category: form.category,
        spent_on: form.spent_on,
        amount: Number(form.amount),
        description: form.description,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      setSaving(false);
    }
  }

  const field = 'w-full h-10 rounded-lg border border-border px-2 text-sm outline-none focus:border-primary';

  return (
    <form onSubmit={submit} className="border border-border rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Categoría</span>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={field}>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.icon} {c.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Fecha</span>
          <input type="date" required value={form.spent_on} onChange={(e) => setForm({ ...form, spent_on: e.target.value })} className={field} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Cliente</span>
          <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className={field}>
            <option value="">Sin cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Valor</span>
          <input type="number" required min="0" step="1000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={field} />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Detalle</span>
        <input
          placeholder="¿En qué se gastó?"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={field}
        />
      </label>
      {error && <p className="text-danger text-xs">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-soft disabled:opacity-50 transition">
          {saving ? 'Guardando…' : 'Guardar gasto'}
        </button>
        <button type="button" onClick={onCancel} className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-surface transition">
          Cancelar
        </button>
      </div>
    </form>
  );
}
