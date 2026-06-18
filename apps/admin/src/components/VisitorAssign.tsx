'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { assignVisitor } from '@/app/actions/users';

interface Visitor { id: string; name: string; phone?: string | null; email?: string | null; city?: string | null }

export function VisitorAssign({
  userId, currentVisitor, visitors,
}: {
  userId: string;
  currentVisitor: Visitor | null;
  visitors: Visitor[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentVisitor?.id ?? '');

  function save() {
    startTransition(async () => {
      await assignVisitor(userId, draft || null);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div>
      {!editing ? (
        <div>
          {currentVisitor ? (
            <div>
              <p className="text-primary font-semibold">{currentVisitor.name}</p>
              <p className="text-sm text-secondary mt-0.5">
                {[currentVisitor.phone, currentVisitor.email, currentVisitor.city].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
          ) : (
            <p className="text-secondary text-sm italic">Sin visitador asignado.</p>
          )}
          <button
            onClick={() => { setDraft(currentVisitor?.id ?? ''); setEditing(true); }}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            {currentVisitor ? 'Cambiar' : 'Asignar visitador'}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={draft} onChange={(e) => setDraft(e.target.value)}
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm flex-1"
          >
            <option value="">Sin visitador</option>
            {visitors.map((v) => <option key={v.id} value={v.id}>{v.name}{v.city ? ` · ${v.city}` : ''}</option>)}
          </select>
          <button onClick={save} disabled={isPending} className="px-3 h-10 rounded-md bg-primary text-white text-xs font-semibold disabled:opacity-50">
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-secondary">Cancelar</button>
        </div>
      )}
    </div>
  );
}
