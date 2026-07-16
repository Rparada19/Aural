'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { regenerateReportBody, deleteReport, toggleGoldExample } from '@/app/actions/reports';

export function ReportActions({
  reportId,
  professionalId,
  patientId,
  hasBody,
  isGold,
}: {
  reportId: string;
  professionalId: string;
  patientId: string;
  hasBody: boolean;
  isGold: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function regen() {
    setError(null);
    startTransition(async () => {
      try {
        await regenerateReportBody(reportId, professionalId, patientId);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al re-generar.');
      }
    });
  }

  function remove() {
    if (!confirm('¿Eliminar este informe? No se puede deshacer.')) return;
    startTransition(async () => {
      try {
        await deleteReport(reportId, professionalId, patientId);
        router.push(`/users/${professionalId}/patients/${patientId}`);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al eliminar.');
      }
    });
  }

  function toggleGold() {
    setError(null);
    startTransition(async () => {
      try {
        await toggleGoldExample(reportId, !isGold, professionalId, patientId);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error.');
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={regen}
        disabled={isPending}
        className="px-4 h-10 rounded-md bg-primary text-white font-semibold text-sm hover:bg-primary-soft disabled:opacity-50"
      >
        {isPending ? 'Generando…' : hasBody ? 'Re-generar con IA' : 'Generar con IA'}
      </button>
      {hasBody && (
        <button
          onClick={toggleGold}
          disabled={isPending}
          className={`px-4 h-10 rounded-md border font-semibold text-sm disabled:opacity-50 ${
            isGold
              ? 'border-warning bg-warning/10 text-warning hover:bg-warning/20'
              : 'border-border text-secondary hover:bg-surface'
          }`}
        >
          {isGold ? '⭐ Ejemplo gold (quitar)' : '☆ Marcar como ejemplo gold'}
        </button>
      )}
      <button
        onClick={remove}
        disabled={isPending}
        className="px-4 h-10 rounded-md border border-danger text-danger font-semibold text-sm hover:bg-danger/10 disabled:opacity-50"
      >
        Eliminar
      </button>
      {error && <p className="w-full text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>}
    </div>
  );
}
