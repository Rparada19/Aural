'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCatalogItem, toggleCatalogItem, updateCatalogItem } from '@/app/actions/catalogs';

interface Row {
  id: string;
  is_active: boolean;
  [key: string]: any;
}

interface Props {
  title: string;
  table: string;
  field: string;
  fieldLabel: string;
  rows: Row[];
  extraColumnLabel?: string;
}

export function CatalogManager({ title, table, field, fieldLabel, rows, extraColumnLabel }: Props) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isPending, startTransition] = useTransition();

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    startTransition(async () => {
      await createCatalogItem(table, { [field]: v });
      setValue('');
      router.refresh();
    });
  }

  function onToggle(id: string, current: boolean) {
    startTransition(async () => {
      await toggleCatalogItem(table, id, !current);
      router.refresh();
    });
  }

  function onSaveEdit(id: string) {
    const v = editValue.trim();
    if (!v) return;
    startTransition(async () => {
      await updateCatalogItem(table, id, { [field]: v });
      setEditingId(null);
      router.refresh();
    });
  }

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-primary">{title}</h3>
      </div>

      <form onSubmit={onAdd} className="flex gap-2 p-4 border-b border-border bg-surface/50">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Nuevo ${fieldLabel.toLowerCase()}`}
          className="flex-1 h-10 rounded-md border border-border bg-white px-3 outline-none focus:border-primary text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-4 h-10 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-soft disabled:opacity-40"
        >
          Añadir
        </button>
      </form>

      <ul className="divide-y divide-border max-h-72 overflow-y-auto">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm">
            {editingId === r.id ? (
              <>
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 h-9 rounded-md border border-border px-2 text-sm"
                  autoFocus
                />
                <button onClick={() => onSaveEdit(r.id)} className="text-xs text-success font-semibold">Guardar</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-secondary">Cancelar</button>
              </>
            ) : (
              <>
                <span className={`flex-1 ${!r.is_active ? 'text-secondary line-through' : 'text-foreground'}`}>
                  {r[field]}
                </span>
                {r._extra && (
                  <span className="text-xs text-secondary w-32 truncate">{r._extra}</span>
                )}
                <button
                  onClick={() => { setEditingId(r.id); setEditValue(r[field]); }}
                  className="text-xs text-primary hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => onToggle(r.id, r.is_active)}
                  disabled={isPending}
                  className={`text-xs font-semibold ${r.is_active ? 'text-warning' : 'text-success'}`}
                >
                  {r.is_active ? 'Desactivar' : 'Activar'}
                </button>
              </>
            )}
          </li>
        ))}
        {rows.length === 0 && (
          <li className="px-5 py-6 text-center text-secondary text-sm">Sin elementos.</li>
        )}
      </ul>
      {extraColumnLabel && (
        <div className="px-5 py-2 text-[10px] uppercase tracking-wider text-secondary border-t border-border">
          Columna adicional: {extraColumnLabel}
        </div>
      )}
    </div>
  );
}
