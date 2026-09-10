'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addProjectNote, deleteProjectNote, getDownloadUrl } from '@/app/actions/wholesale';

export interface Note {
  id: string;
  author_name: string | null;
  author_role: string | null;
  body: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  progress_percent: number | null;
  created_at: string;
}

const kb = (n: number | null) =>
  n === null ? '' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

function when(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export function ProjectThread({
  projectId, notes, progress, myRole,
}: {
  projectId: string;
  notes: Note[];
  progress: number;
  myRole: 'coordinator' | 'rep';
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportProgress, setReportProgress] = useState(false);
  const [value, setValue] = useState(progress);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set('project_id', projectId);
    if (!reportProgress) fd.delete('progress_percent');
    try {
      await addProjectNote(fd);
      form.reset();
      setFileName(null);
      setReportProgress(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar');
    } finally {
      setSaving(false);
    }
  }

  async function open(note: Note) {
    if (!note.file_path) return;
    setBusy(note.id);
    try {
      const url = await getDownloadUrl(note.file_path);
      window.open(url, '_blank', 'noopener');
    } catch {
      alert('No se pudo abrir el archivo');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <ol className="relative">
        {notes.length === 0 && (
          <p className="text-[13px] text-[var(--ink-soft)] py-6">
            Todavía no hay conversación en este proyecto. Escribe el primer avance.
          </p>
        )}

        {notes.map((n) => {
          const mine = n.author_role === (myRole === 'coordinator' ? 'Coordinación' : 'Comercial');
          return (
            <li key={n.id} className="relative pl-5 pb-5 border-l border-[var(--rule)] last:border-transparent">
              {/* El punto ancla el mensaje en la línea de tiempo */}
              <span
                className="absolute -left-[3.5px] top-1.5 w-[7px] h-[7px] rounded-full"
                style={{ background: mine ? 'var(--accent)' : 'var(--ink)' }}
              />

              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[13px] font-medium">{n.author_name ?? 'Alguien'}</span>
                <span className="wsale-overline">{n.author_role}</span>
                <span className="text-[11px] text-[var(--ink-faint)] ml-auto">{when(n.created_at)}</span>
              </div>

              {n.body && (
                <p className="text-[13px] mt-1.5 leading-relaxed whitespace-pre-wrap break-words">{n.body}</p>
              )}

              {n.progress_percent !== null && (
                <p className="text-[12px] mt-1.5 text-[var(--accent)] font-medium">
                  Avance reportado: {n.progress_percent}%
                </p>
              )}

              {n.file_path && (
                <button
                  onClick={() => open(n)}
                  disabled={busy === n.id}
                  className="mt-2 inline-flex items-center gap-2 border border-[var(--rule-strong)] rounded-[2px] px-2.5 py-1.5 text-[12px] hover:border-[var(--accent)] hover:text-[var(--accent)] transition disabled:opacity-50"
                >
                  <span className="wsale-mono text-[10px]">
                    {(n.file_name ?? '').split('.').pop()?.toUpperCase().slice(0, 4) || 'DOC'}
                  </span>
                  <span className="truncate max-w-[280px]">{n.file_name}</span>
                  <span className="text-[var(--ink-faint)]">{kb(n.file_size)}</span>
                </button>
              )}

              <button
                onClick={async () => { setBusy(n.id); await deleteProjectNote(n.id, projectId); router.refresh(); setBusy(null); }}
                disabled={busy === n.id}
                className="block mt-2 text-[11px] text-[var(--ink-faint)] hover:text-[var(--alert)] disabled:opacity-50"
              >
                Borrar
              </button>
            </li>
          );
        })}
      </ol>

      <form onSubmit={submit} className="mt-4 pt-5 border-t border-[var(--rule)] space-y-3">
        <textarea
          name="body"
          rows={3}
          placeholder="Escribe un avance, una pregunta o una observación…"
          className="w-full rounded-[2px] border border-[var(--rule-strong)] bg-white p-3 text-[13px] outline-none focus:border-[var(--accent)]"
        />

        <div className="flex flex-wrap items-center gap-4">
          <label className="text-[12px] text-[var(--ink-soft)]">
            <input
              type="file"
              name="file"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              className="text-[12px] file:mr-2 file:h-8 file:px-3 file:rounded-[2px] file:border file:border-[var(--rule-strong)] file:bg-white file:text-[12px] file:cursor-pointer"
            />
          </label>

          <label className="flex items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={reportProgress}
              onChange={(e) => setReportProgress(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Reportar avance
          </label>

          {reportProgress && (
            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
              <input
                type="range"
                name="progress_percent"
                min="0"
                max="100"
                step="5"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="flex-1 accent-[var(--accent)]"
              />
              <span className="wsale-figure text-[13px] w-10 text-right">{value}%</span>
            </div>
          )}
        </div>

        {fileName && (
          <p className="text-[11px] text-[var(--ink-faint)]">Adjunto: {fileName}</p>
        )}
        {error && <p className="wsale-bad text-[12px]">{error}</p>}

        <button type="submit" disabled={saving} className="wsale-btn">
          {saving ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
