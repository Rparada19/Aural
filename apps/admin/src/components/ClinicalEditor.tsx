'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePatient } from '@/app/actions/patients';

export function ClinicalEditor({ patientId, professionalId, initial }: { patientId: string; professionalId: string; initial: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState(initial ?? '');
  const [editing, setEditing] = useState(false);

  function save() {
    startTransition(async () => {
      await updatePatient(patientId, professionalId, { clinical_findings: draft });
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div>
        <p className="text-foreground whitespace-pre-wrap">{initial || '—'}</p>
        <button onClick={() => setEditing(true)} className="mt-2 text-xs font-semibold text-primary hover:underline">
          Editar hallazgos
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <textarea
        rows={5} value={draft} onChange={(e) => setDraft(e.target.value)}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary text-sm"
      />
      <div className="flex gap-2">
        <button onClick={save} disabled={isPending} className="px-4 h-10 rounded-md bg-primary text-white text-sm font-semibold disabled:opacity-50">
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={() => { setEditing(false); setDraft(initial ?? ''); }} className="px-4 h-10 rounded-md border border-border text-secondary text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}
