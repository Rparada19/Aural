'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addClinicalNote, addFollowup } from '@/app/actions/patients';

export function NoteAdder({ patientId, professionalId, kind }: { patientId: string; professionalId: string; kind: 'note' | 'followup' }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextAt, setNextAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (body.trim().length < 3) { setError('Mínimo 3 caracteres.'); return; }
    startTransition(async () => {
      try {
        if (kind === 'note') {
          await addClinicalNote(patientId, professionalId, body.trim());
        } else {
          await addFollowup(patientId, professionalId, {
            comment: body.trim(),
            next_action: nextAction || undefined,
            next_action_at: nextAt ? new Date(nextAt).toISOString() : undefined,
          });
        }
        setBody(''); setNextAction(''); setNextAt('');
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error.');
      }
    });
  }

  return (
    <div className="space-y-3 mb-4 pb-4 border-b border-border">
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={kind === 'note' ? 'Nueva evolución clínica…' : 'Comentario del seguimiento…'}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary text-sm"
      />
      {kind === 'followup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={nextAction} onChange={(e) => setNextAction(e.target.value)}
            placeholder="Próxima acción (opcional)"
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm"
          />
          <input
            type="datetime-local" value={nextAt} onChange={(e) => setNextAt(e.target.value)}
            className="h-10 rounded-md border border-border bg-surface px-3 text-sm"
          />
        </div>
      )}
      {error && <p className="text-danger text-xs">{error}</p>}
      <button onClick={submit} disabled={isPending} className="px-4 h-10 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-soft disabled:opacity-50">
        {isPending ? 'Guardando…' : kind === 'note' ? 'Agregar evolución' : 'Agregar seguimiento'}
      </button>
    </div>
  );
}
