'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { uploadExamImage, createReport, generateReportWithAI } from '@/app/actions/reports';

export function ReportComposer({ patientId, professionalId }: { patientId: string; professionalId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [audio, setAudio] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [otoscopy, setOtoscopy] = useState('');
  const [title, setTitle] = useState('Informe audiológico');
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);

  async function uploadIfPresent(file: File | null, kind: string) {
    if (!file) return null;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('patient_id', patientId);
    fd.append('kind', kind);
    return await uploadExamImage(fd);
  }

  function onSubmit(generate: boolean) {
    setError(null);
    setGenerated(null);
    startTransition(async () => {
      try {
        const [audioPath, logoPath] = await Promise.all([
          uploadIfPresent(audio, 'audiometry'),
          uploadIfPresent(logo, 'logoaudiometry'),
        ]);
        const report = await createReport(patientId, professionalId, {
          title,
          audiometry_url: audioPath,
          logoaudiometry_url: logoPath,
          otoscopy_description: otoscopy || null,
        });
        if (generate) {
          const body = await generateReportWithAI(report.id, professionalId, patientId);
          setGenerated(body);
        }
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al guardar el informe.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Título</span>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FileField label="Audiometría (imagen)" onChange={setAudio} value={audio} />
        <FileField label="Logoaudiometría (imagen)" onChange={setLogo} value={logo} />
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Otoscopia (descripción)</span>
        <textarea
          rows={3} value={otoscopy} onChange={(e) => setOtoscopy(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
          placeholder="Hallazgos otoscópicos…"
        />
      </label>

      {error && <p className="text-danger text-sm">{error}</p>}
      {generated && (
        <div className="bg-success/10 border border-success/30 rounded-md p-3 text-sm">
          <p className="font-semibold text-success mb-2">Informe generado por IA</p>
          <pre className="whitespace-pre-wrap text-foreground text-sm">{generated}</pre>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onSubmit(false)}
          disabled={isPending}
          className="px-4 h-11 rounded-md border border-primary text-primary font-semibold hover:bg-surface disabled:opacity-50"
        >
          Solo guardar
        </button>
        <button
          onClick={() => onSubmit(true)}
          disabled={isPending}
          className="px-4 h-11 rounded-md bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-50"
        >
          {isPending ? 'Procesando…' : 'Crear informe con IA'}
        </button>
      </div>
    </div>
  );
}

function FileField({ label, value, onChange }: { label: string; value: File | null; onChange: (f: File | null) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">{label}</span>
      <div className="mt-1 border-2 border-dashed border-border rounded-md p-3 bg-surface flex items-center gap-3">
        <input
          type="file" accept="image/*"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="text-sm file:mr-3 file:px-3 file:py-1.5 file:border-0 file:bg-primary file:text-white file:font-semibold file:text-xs file:rounded"
        />
      </div>
      {value && <p className="text-xs text-secondary mt-1">{value.name}</p>}
    </label>
  );
}
