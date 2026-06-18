'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markLeadAsManaged } from '@/app/actions/patients';

export function LeadManagedButton({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function click() {
    startTransition(async () => {
      await markLeadAsManaged(patientId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={click}
      disabled={isPending}
      className="px-2.5 py-1 rounded-md bg-success text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40"
    >
      {isPending ? 'Procesando…' : '✓ Marcar gestionado'}
    </button>
  );
}
