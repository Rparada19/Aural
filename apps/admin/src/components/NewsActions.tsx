'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateContentStatus, deleteContent } from '@/app/actions/content';

export function NewsActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setStatus(s: 'draft' | 'scheduled' | 'published' | 'archived') {
    startTransition(async () => { await updateContentStatus(id, s); router.refresh(); });
  }
  function remove() {
    if (!confirm('¿Eliminar esta publicación?')) return;
    startTransition(async () => { await deleteContent(id); router.refresh(); });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Link href={`/news/${id}/edit`} className="text-xs font-semibold text-primary hover:underline">Editar</Link>
      {status !== 'published' && (
        <button onClick={() => setStatus('published')} disabled={isPending} className="text-xs font-semibold text-success hover:underline">Publicar</button>
      )}
      {status === 'published' && (
        <button onClick={() => setStatus('archived')} disabled={isPending} className="text-xs font-semibold text-secondary hover:underline">Archivar</button>
      )}
      {status === 'archived' && (
        <button onClick={() => setStatus('draft')} disabled={isPending} className="text-xs font-semibold text-primary hover:underline">Restaurar</button>
      )}
      <button onClick={remove} disabled={isPending} className="text-xs font-semibold text-danger hover:underline">Eliminar</button>
    </div>
  );
}
