'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCatalogItem, toggleCatalogItem, updateCatalogItem } from '@/app/actions/catalogs';

interface Row { id: string; name: string; phone?: string | null; email?: string | null; city?: string | null; monthly_budget?: number | null; is_active: boolean }

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function VisitorManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [budget, setBudget] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Row>({ id: '', name: '', phone: '', email: '', city: '', monthly_budget: null, is_active: true });

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await createCatalogItem('visitors', { name: name.trim(), phone: phone || null, email: email || null, city: city || null, monthly_budget: budget ? Number(budget) : null });
      setName(''); setPhone(''); setEmail(''); setCity(''); setBudget('');
      router.refresh();
    });
  }
  function saveEdit(id: string) {
    startTransition(async () => {
      await updateCatalogItem('visitors', id, {
        name: edit.name, phone: edit.phone || null, email: edit.email || null, city: edit.city || null,
        monthly_budget: edit.monthly_budget !== null && edit.monthly_budget !== undefined ? Number(edit.monthly_budget) : null,
      });
      setEditingId(null);
      router.refresh();
    });
  }
  function toggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleCatalogItem('visitors', id, !active);
      router.refresh();
    });
  }

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-primary">Visitadores médicos</h3>
      </div>

      <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 border-b border-border bg-surface/50">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" className="h-10 rounded-md border border-border bg-white px-3 text-sm" />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad" className="h-10 rounded-md border border-border bg-white px-3 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" className="h-10 rounded-md border border-border bg-white px-3 text-sm" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" className="h-10 rounded-md border border-border bg-white px-3 text-sm" />
        <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Presupuesto mensual COP" type="number" min="0" className="md:col-span-2 h-10 rounded-md border border-border bg-white px-3 text-sm" />
        <button type="submit" disabled={isPending} className="md:col-span-2 h-10 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-soft disabled:opacity-50">
          Añadir visitador
        </button>
      </form>

      <ul className="divide-y divide-border max-h-96 overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="px-5 py-3 text-sm">
            {editingId === r.id ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="h-9 rounded-md border border-border px-2 text-sm" />
                <input value={edit.city ?? ''} onChange={(e) => setEdit({ ...edit, city: e.target.value })} placeholder="Ciudad" className="h-9 rounded-md border border-border px-2 text-sm" />
                <input value={edit.phone ?? ''} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="Teléfono" className="h-9 rounded-md border border-border px-2 text-sm" />
                <input value={edit.email ?? ''} onChange={(e) => setEdit({ ...edit, email: e.target.value })} placeholder="Correo" className="h-9 rounded-md border border-border px-2 text-sm" />
                <input
                  type="number" min="0"
                  value={edit.monthly_budget ?? ''}
                  onChange={(e) => setEdit({ ...edit, monthly_budget: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Presupuesto mensual COP"
                  className="md:col-span-2 h-9 rounded-md border border-border px-2 text-sm"
                />
                <div className="md:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(r.id)} className="text-xs text-success font-semibold">Guardar</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-secondary">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className={`font-medium ${!r.is_active ? 'text-secondary line-through' : 'text-primary'}`}>{r.name}</p>
                  <p className="text-xs text-secondary">
                    {r.city ?? '(sin ciudad)'}
                    {r.phone ? ` · ${r.phone}` : ''}
                    {r.email ? ` · ${r.email}` : ''}
                    {r.monthly_budget ? ` · Presupuesto: ${cop(Number(r.monthly_budget))}` : ''}
                  </p>
                </div>
                <button onClick={() => { setEditingId(r.id); setEdit(r); }} className="text-xs text-primary hover:underline">Editar</button>
                <button onClick={() => toggle(r.id, r.is_active)} disabled={isPending} className={`text-xs font-semibold ${r.is_active ? 'text-warning' : 'text-success'}`}>
                  {r.is_active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="px-5 py-6 text-center text-secondary text-sm">Sin visitadores.</li>}
      </ul>
    </div>
  );
}
