'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateAIConfig, type GlossaryEntry } from '@/app/actions/reports';

const PROMPT_PLACEHOLDER = `Ejemplo de instrucciones base:

- Tono clínico, firme y personalizado. Nunca genérico.
- Usa terminología audiológica colombiana (PTA, SRT, discriminación, configuración audiométrica).
- No inventes hallazgos que no estén en los inputs.
- La sección de Recomendaciones debe justificar por qué el producto cotizado es apropiado.
- Firma siempre con el nombre de la audióloga tratante al final.`;

export function AIConfigEditor({
  initial,
}: {
  initial: {
    system_prompt: string;
    glossary: GlossaryEntry[];
    banned_words: string[];
    report_sections: string[];
    updated_at: string | null;
  };
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initial.system_prompt);
  const [sectionsText, setSectionsText] = useState(initial.report_sections.join('\n'));
  const [bannedText, setBannedText] = useState(initial.banned_words.join('\n'));
  const [glossaryText, setGlossaryText] = useState(
    initial.glossary.map((g) => `${g.avoid} → ${g.prefer}`).join('\n'),
  );

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function parseGlossary(text: string): GlossaryEntry[] {
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [avoid, prefer] = line.split(/→|->|\|/).map((s) => s.trim());
        return avoid && prefer ? { avoid, prefer } : null;
      })
      .filter((x): x is GlossaryEntry => !!x);
  }

  function save() {
    setError(null);
    setOk(false);
    const payload = {
      system_prompt: prompt,
      report_sections: sectionsText.split('\n').map((s) => s.trim()).filter(Boolean),
      banned_words: bannedText.split('\n').map((s) => s.trim()).filter(Boolean),
      glossary: parseGlossary(glossaryText),
    };
    startTransition(async () => {
      try {
        await updateAIConfig(payload);
        setOk(true);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al guardar.');
      }
    });
  }

  return (
    <div className="space-y-8">
      <Section
        title="Instrucciones base (system prompt)"
        hint="Se inyectan en cada generación como mensaje de sistema."
      >
        <textarea
          value={prompt}
          onChange={(e) => { setPrompt(e.target.value); setOk(false); }}
          rows={12}
          placeholder={PROMPT_PLACEHOLDER}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary font-mono text-sm leading-6 resize-y"
        />
      </Section>

      <Section
        title="Estructura obligatoria del informe"
        hint="Una línea = un encabezado. La IA usará este orden exacto."
      >
        <textarea
          value={sectionsText}
          onChange={(e) => { setSectionsText(e.target.value); setOk(false); }}
          rows={6}
          placeholder={'Identificación del paciente\nResumen otoscópico\nAudiometría tonal liminar\nLogoaudiometría\nDiagnóstico audiológico\nRecomendaciones'}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary font-mono text-sm leading-6 resize-y"
        />
      </Section>

      <Section
        title="Glosario terminológico"
        hint='Una línea por regla, formato: "palabra a evitar → palabra preferida".'
      >
        <textarea
          value={glossaryText}
          onChange={(e) => { setGlossaryText(e.target.value); setOk(false); }}
          rows={6}
          placeholder={'sordera → hipoacusia\naparato → audífono\npaciente sordo → paciente con hipoacusia'}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary font-mono text-sm leading-6 resize-y"
        />
      </Section>

      <Section
        title="Palabras/frases prohibidas"
        hint="Una por línea. La IA NO las usará."
      >
        <textarea
          value={bannedText}
          onChange={(e) => { setBannedText(e.target.value); setOk(false); }}
          rows={6}
          placeholder={'defecto\nincurable\ndaño irreversible'}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary font-mono text-sm leading-6 resize-y"
        />
      </Section>

      {error && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>}
      {ok && <p className="text-success text-sm bg-success/10 px-3 py-2 rounded-md">Configuración guardada.</p>}

      <div className="flex flex-wrap items-center gap-3 sticky bottom-0 bg-white/95 backdrop-blur border-t border-border py-3 -mx-6 px-6">
        <button
          onClick={save}
          disabled={isPending}
          className="px-5 h-11 rounded-md bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-40"
        >
          {isPending ? 'Guardando…' : 'Guardar todo'}
        </button>
        {initial.updated_at && (
          <p className="text-xs text-secondary">
            Última actualización: {new Date(initial.updated_at).toLocaleString('es-CO')}
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-semibold text-primary">{title}</h3>
        {hint && <span className="text-xs text-secondary">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
