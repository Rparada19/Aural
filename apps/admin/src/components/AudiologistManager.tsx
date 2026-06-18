'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCatalogItem, toggleCatalogItem, updateCatalogItem } from '@/app/actions/catalogs';

interface Loc { id: string; name: string }
interface Row { id: string; name: string; location_id: string | null; phone?: string | null; email?: string | null; is_active: boolean; locationName?: string }

export function AudiologistManager({ rows, locations }: { rows: Row[]; locations: Loc[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [locId, setLocId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ name: string; location_id: string; phone: string; email: string }>({ name: '', location_id: '', phone: '', email: '' });

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      await createCatalogItem('audiologists', {
        name: name.trim(),
        phone: phone || null,
        email: email || null,
        location_id: locId || null,
      });
      setName(''); setPhone(''); setEmail(''); setLocId('');
      router.refresh();
    });
  }
  function saveEdit(id: string) {
    startTransition(async () => {
      await updateCatalogItem('audiologists', id, {
        name: edit.name.trim(),
        phone: edit.phone || null,
        email: edit.email || null,
        location_id: edit.location_id || null,
      });
      setEditingId(null);
      router.refresh();
    });
  }
  function toggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleCatalogItem('audiologists', id, !active);
      router.refresh();
    });
  }

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-primary">Audiólogos</h3>
      </div>

      <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 border-b border-border bg-surface/50">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" className="h-10 rounded-md border border-border bg-white px-3 text-sm" />
        <select value={locId} onChange={(e) => setLocId(e.target.value)} className="h-10 rounded-md border border-border bg-white px-3 text-sm">
          <option value="">Sede (opcional)</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" className="h-10 rounded-md border border-border bg-white px-3 text-sm" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" className="h-10 rounded-md border border-border bg-white px-3 text-sm" />
        <button type="submit" disabled={isPending} className="md:col-span-2 h-10 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-soft disabled:opacity-50">
          Añadir audiólogo
        </button>
      </form>

      <ul className="divide-y divide-border max-h-96 overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="px-5 py-3 text-sm">
            {editingId === r.id ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="h-9 rounded-md border border-border px-2 text-sm" />
                <select value={edit.location_id} onChange={(e) => setEdit({ ...edit, location_id: e.target.value })} className="h-9 rounded-md border border-border px-2 text-sm">
                  <option value="">Sede (opcional)</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} placeholder="Teléfono" className="h-9 rounded-md border border-border px-2 text-sm" />
                <input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} placeholder="Correo" className="h-9 rounded-md border border-border px-2 text-sm" />
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
                    {r.locationName ?? '(sin sede)'}
                    {r.phone ? ` · ${r.phone}` : ''}
                    {r.email ? ` · ${r.email}` : ''}
                  </p>
                </div>
                <button onClick={() => { setEditingId(r.id); setEdit({ name: r.name, location_id: r.location_id ?? '', phone: r.phone ?? '', email: r.email ?? '' }); }} className="text-xs text-primary hover:underline">Editar</button>
                <button onClick={() => toggle(r.id, r.is_active)} disabled={isPending} className={`text-xs font-semibold ${r.is_active ? 'text-warning' : 'text-success'}`}>
                  {r.is_active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="px-5 py-6 text-center text-secondary text-sm">Sin audiólogos.</li>}
      </ul>
    </div>
  );
}
