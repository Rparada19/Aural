'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateReportBody } from '@/app/actions/reports';

export function ReportBodyEditor({
  reportId,
  professionalId,
  patientId,
  initialBody,
  canEdit,
}: {
  reportId: string;
  professionalId: string;
  patientId: string;
  initialBody: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(initialBody);
  const [savedBody, setSavedBody] = useState(initialBody);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasBody = savedBody.trim().length > 0;
  const dirty = body !== savedBody;

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateReportBody(reportId, professionalId, patientId, body);
        setSavedBody(body);
        setEditing(false);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al guardar.');
      }
    });
  }

  function cancel() {
    setBody(savedBody);
    setEditing(false);
    setError(null);
  }

  if (!editing) {
    return (
      <div>
        {hasBody ? (
          <article className="whitespace-pre-wrap text-foreground text-sm leading-6">
            {savedBody}
          </article>
        ) : (
          <div className="text-secondary text-sm">
            <p className="font-semibold text-foreground mb-1">Este informe no tiene cuerpo guardado.</p>
            <p>Re-genera con IA para persistirlo, o elimínalo.</p>
          </div>
        )}
        {canEdit && hasBody && (
          <div className="mt-4">
            <button
              onClick={() => setEditing(true)}
              className="px-4 h-10 rounded-md border border-border text-primary font-semibold text-sm hover:bg-surface"
            >
              Editar cuerpo
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={24}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary font-mono text-sm leading-6 resize-y"
      />
      {error && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={save}
          disabled={isPending || !dirty}
          className="px-5 h-11 rounded-md bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-40"
        >
          {isPending ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Sin cambios'}
        </button>
        <button
          onClick={cancel}
          disabled={isPending}
          className="px-5 h-11 rounded-md border border-border text-secondary"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
