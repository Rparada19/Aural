'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { uploadExamImage, createReport, generateReportWithAI, updateReportBody, deleteReport } from '@/app/actions/reports';

export function ReportComposer({ patientId, professionalId }: { patientId: string; professionalId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [audio, setAudio] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [otoscopy, setOtoscopy] = useState('');
  const [title, setTitle] = useState('Informe audiológico');
  const [error, setError] = useState<string | null>(null);

  // Estado del borrador IA en edición
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState<string>('');
  const [bodyDirty, setBodyDirty] = useState(false);

  async function uploadIfPresent(file: File | null, kind: string) {
    if (!file) return null;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('patient_id', patientId);
    fd.append('kind', kind);
    return await uploadExamImage(fd);
  }

  function generate() {
    setError(null);
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
        const body = await generateReportWithAI(report.id, professionalId, patientId);
        setDraftId(report.id);
        setDraftBody(body);
        setBodyDirty(false);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al generar.');
      }
    });
  }

  function saveBody() {
    if (!draftId) return;
    startTransition(async () => {
      try {
        await updateReportBody(draftId, professionalId, patientId, draftBody);
        setBodyDirty(false);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al guardar.');
      }
    });
  }

  function discard() {
    if (!draftId) return;
    if (!confirm('¿Descartar este borrador? Se eliminará el informe.')) return;
    startTransition(async () => {
      await deleteReport(draftId);
      setDraftId(null);
      setDraftBody('');
      setAudio(null);
      setLogo(null);
      setOtoscopy('');
      setTitle('Informe audiológico');
      router.refresh();
    });
  }

  function newOne() {
    setDraftId(null);
    setDraftBody('');
    setAudio(null);
    setLogo(null);
    setOtoscopy('');
    setTitle('Informe audiológico');
    setBodyDirty(false);
  }

  // Vista de edición / preview del borrador
  if (draftId) {
    return (
      <div className="space-y-4">
        <div className="bg-warning/10 border border-warning/30 rounded-md p-3 text-sm">
          <p className="font-semibold text-warning">Borrador generado — revisa, corrige y guarda.</p>
          <p className="text-warning/80 text-xs mt-1">
            El informe queda visible para el doctor solo después de que guardes los cambios.
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Cuerpo del informe</span>
          <textarea
            value={draftBody}
            onChange={(e) => { setDraftBody(e.target.value); setBodyDirty(true); }}
            rows={20}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary font-mono text-sm leading-6 resize-y"
          />
        </label>

        {error && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={saveBody}
            disabled={isPending || !bodyDirty}
            className="px-5 h-11 rounded-md bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-40"
          >
            {isPending ? 'Guardando…' : bodyDirty ? 'Guardar cambios' : 'Sin cambios'}
          </button>
          <button
            onClick={newOne}
            disabled={isPending}
            className="px-5 h-11 rounded-md border border-border text-secondary"
          >
            Crear otro informe
          </button>
          <button
            onClick={discard}
            disabled={isPending}
            className="px-5 h-11 rounded-md border border-danger text-danger hover:bg-danger/10"
          >
            Descartar borrador
          </button>
        </div>
      </div>
    );
  }

  // Vista del formulario inicial
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

      {error && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>}

      <div className="pt-2">
        <button
          onClick={generate}
          disabled={isPending}
          className="px-5 h-11 rounded-md bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-50"
        >
          {isPending ? 'Generando con IA…' : 'Generar borrador con IA'}
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
