'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveUser, rejectUser, suspendUser, reactivateUser } from '@/app/actions/users';

type Status = 'pending' | 'approved' | 'rejected' | 'suspended' | string;

interface Props { userId: string; status: Status; rejectionReason?: string | null }

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  approved: 'bg-success/15 text-success',
  rejected: 'bg-danger/15 text-danger',
  suspended: 'bg-secondary/15 text-secondary',
};

export function ProStatusControls({ userId, status, rejectionReason }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function call(fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e: any) {
        alert(e?.message ?? 'Error');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${STATUS_CLASS[status] ?? 'bg-border'}`}>
        {STATUS_LABEL[status] ?? status}
      </span>
      {rejectionReason && (
        <span className="text-xs text-secondary max-w-xs text-right italic">Motivo: {rejectionReason}</span>
      )}
      <div className="flex flex-wrap gap-2 justify-end">
        {(status === 'pending' || status === 'rejected' || status === 'suspended') && (
          <button
            onClick={() => call(() => status === 'pending' ? approveUser(userId) : reactivateUser(userId))}
            disabled={isPending}
            className="px-3 py-1.5 rounded-md bg-success text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40"
          >
            {status === 'pending' ? 'Aprobar' : 'Reactivar'}
          </button>
        )}
        {status === 'approved' && (
          <button
            onClick={() => {
              const r = window.prompt('Motivo de suspensión (opcional):') ?? '';
              call(() => suspendUser(userId, r));
            }}
            disabled={isPending}
            className="px-3 py-1.5 rounded-md border border-warning text-warning text-xs font-semibold hover:bg-warning/10 disabled:opacity-40"
          >
            Suspender
          </button>
        )}
        {status !== 'rejected' && (
          <button
            onClick={() => {
              const r = window.prompt('Motivo del rechazo (opcional):') ?? '';
              call(() => rejectUser(userId, r));
            }}
            disabled={isPending}
            className="px-3 py-1.5 rounded-md border border-danger text-danger text-xs font-semibold hover:bg-danger/10 disabled:opacity-40"
          >
            {status === 'pending' ? 'Rechazar' : 'Bloquear'}
          </button>
        )}
      </div>
    </div>
  );
}
