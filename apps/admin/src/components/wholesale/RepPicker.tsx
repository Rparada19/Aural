'use client';

import { useState, useTransition } from 'react';
import { assignClientRep } from '@/app/actions/wholesale';

export function RepPicker({
  clientId, repId, reps,
}: {
  clientId: string;
  repId: string | null;
  reps: { id: string; name: string; zone: string | null }[];
}) {
  const [value, setValue] = useState(repId ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(next: string) {
    const prev = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      try {
        await assignClientRep(clientId, next || null);
      } catch {
        setValue(prev);
        setError('No se pudo asignar');
      }
    });
  }

  return (
    <div>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-white px-2 text-sm outline-none focus:border-primary disabled:opacity-50"
      >
        <option value="">Sin asignar</option>
        {reps.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}{r.zone ? ` · ${r.zone}` : ''}
          </option>
        ))}
      </select>
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </div>
  );
}
