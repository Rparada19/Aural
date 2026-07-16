'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateAIConfig } from '@/app/actions/reports';

const PLACEHOLDER = `Ejemplo de instrucciones base:

- Tono clínico, firme y personalizado. Nunca genérico.
- Usa terminología audiológica colombiana (PTA, SRT, discriminación, configuración audiométrica).
- No inventes hallazgos que no estén en los inputs.
- La sección de Recomendaciones debe justificar por qué el producto cotizado es apropiado.
- Firma siempre con el nombre de la audióloga tratante al final.`;

export function AIPromptEditor({ initialPrompt, updatedAt }: { initialPrompt: string; updatedAt: string | null }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [savedPrompt, setSavedPrompt] = useState(initialPrompt);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const dirty = prompt !== savedPrompt;

  function save() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      try {
        await updateAIConfig(prompt);
        setSavedPrompt(prompt);
        setOk(true);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al guardar.');
      }
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={prompt}
        onChange={(e) => { setPrompt(e.target.value); setOk(false); }}
        rows={20}
        placeholder={PLACEHOLDER}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary font-mono text-sm leading-6 resize-y"
      />

      {error && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>}
      {ok && <p className="text-success text-sm bg-success/10 px-3 py-2 rounded-md">Instrucciones guardadas.</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={isPending || !dirty}
          className="px-5 h-11 rounded-md bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-40"
        >
          {isPending ? 'Guardando…' : dirty ? 'Guardar instrucciones' : 'Sin cambios'}
        </button>
        {updatedAt && (
          <p className="text-xs text-secondary">
            Última actualización: {new Date(updatedAt).toLocaleString('es-CO')}
          </p>
        )}
      </div>
    </div>
  );
}
