'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendCampaign, cancelCampaign } from '@/app/actions/marketing';

export function CampaignActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function send() {
    if (!confirm('¿Enviar esta campaña ahora?')) return;
    startTransition(async () => { await sendCampaign(id); router.refresh(); });
  }
  function cancel() {
    startTransition(async () => { await cancelCampaign(id); router.refresh(); });
  }

  if (status === 'sent') return <span className="text-xs text-secondary">—</span>;
  if (status === 'cancelled') return <span className="text-xs text-secondary">—</span>;

  return (
    <div className="inline-flex gap-2">
      <button onClick={send} disabled={isPending} className="text-xs font-semibold text-success hover:underline">
        Enviar ahora
      </button>
      <button onClick={cancel} disabled={isPending} className="text-xs font-semibold text-danger hover:underline">
        Cancelar
      </button>
    </div>
  );
}
