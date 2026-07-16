'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCatalogAISpec } from '@/app/actions/reports';

type Item = { id: string; label: string; ai_spec: string | null };

export function CatalogSpecEditor({
  kind,
  items,
}: {
  kind: 'technology' | 'platform';
  items: Item[];
}) {
  return (
    <ul className="space-y-3">
      {items.length === 0 ? (
        <li className="text-secondary text-sm">Sin elementos activos.</li>
      ) : (
        items.map((it) => <Row key={it.id} kind={kind} item={it} />)
      )}
    </ul>
  );
}

function Row({ kind, item }: { kind: 'technology' | 'platform'; item: Item }) {
  const router = useRouter();
  const [spec, setSpec] = useState(item.ai_spec ?? '');
  const [savedSpec, setSavedSpec] = useState(item.ai_spec ?? '');
  const [isPending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = spec !== savedSpec;

  function save() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await updateCatalogAISpec(kind, item.id, spec);
        setSavedSpec(spec);
        setOk(true);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error.');
      }
    });
  }

  return (
    <li className="border border-border rounded-lg bg-surface/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-primary">{item.label}</p>
        <div className="flex items-center gap-3">
          {ok && <span className="text-xs text-success">Guardado</span>}
          <button
            onClick={save}
            disabled={isPending || !dirty}
            className="text-xs font-semibold text-primary disabled:opacity-40"
          >
            {isPending ? 'Guardando…' : dirty ? 'Guardar' : '—'}
          </button>
        </div>
      </div>
      <textarea
        value={spec}
        onChange={(e) => { setSpec(e.target.value); setOk(false); }}
        rows={3}
        placeholder={`Describe qué es "${item.label}" para que la IA lo redacte con propiedad.`}
        className="w-full rounded-md border border-border bg-white px-3 py-2 outline-none focus:border-primary text-sm resize-y"
      />
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
    </li>
  );
}
