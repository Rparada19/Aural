'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { uploadReferenceDoc, deleteReferenceDoc } from '@/app/actions/reports';

export function ReferenceDocsManager({
  docs,
}: {
  docs: { id: string; title: string; uploaded_at: string }[];
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function upload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) { setError('Selecciona un PDF.'); return; }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('file', file);
        if (title.trim()) fd.append('title', title.trim());
        await uploadReferenceDoc(fd);
        setFile(null);
        setTitle('');
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al subir.');
      }
    });
  }

  function remove(id: string) {
    if (!confirm('¿Eliminar este documento?')) return;
    startTransition(async () => {
      try {
        await deleteReferenceDoc(id);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al eliminar.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={upload} className="space-y-3 border border-border rounded-lg p-4 bg-surface/50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Título (opcional)</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Guía clínica hipoacusia neurosensorial"
              className="mt-1 w-full h-10 rounded-md border border-border bg-white px-3 outline-none focus:border-primary text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">PDF</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:border-0 file:bg-primary file:text-white file:font-semibold file:text-xs file:rounded"
            />
          </label>
        </div>
        {error && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>}
        <button
          type="submit"
          disabled={isPending || !file}
          className="px-5 h-10 rounded-md bg-primary text-white font-semibold text-sm hover:bg-primary-soft disabled:opacity-40"
        >
          {isPending ? 'Subiendo…' : 'Subir PDF'}
        </button>
      </form>

      {docs.length === 0 ? (
        <p className="text-secondary text-sm">
          Sin documentos. Sube PDFs con guías clínicas o informes modelo que quieras que la IA use
          como referencia en cada generación.
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-3 bg-surface/60 border border-border rounded-lg p-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-primary truncate">📄 {d.title}</p>
                <p className="text-xs text-secondary">
                  Subido: {new Date(d.uploaded_at).toLocaleString('es-CO')}
                </p>
              </div>
              <button
                onClick={() => remove(d.id)}
                disabled={isPending}
                className="text-xs text-danger font-semibold hover:underline disabled:opacity-50"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
