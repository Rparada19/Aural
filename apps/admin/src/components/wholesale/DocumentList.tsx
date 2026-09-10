'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadDocument, deleteDocument, getDownloadUrl } from '@/app/actions/wholesale';

export interface DocRow {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  is_public: boolean;
  created_at: string;
  audience: string[];
}

const kb = (n: number | null) =>
  n === null ? '' : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

/** Etiqueta corta por extensión: más honesta que un ícono genérico. */
function kind(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'PDF';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'XLS';
  if (['doc', 'docx'].includes(ext)) return 'DOC';
  if (['ppt', 'pptx'].includes(ext)) return 'PPT';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'IMG';
  if (['mp4', 'mov', 'avi'].includes(ext)) return 'VID';
  return ext.slice(0, 3).toUpperCase() || 'DOC';
}

export function DocumentList({
  docs, reps, canManage,
}: {
  docs: DocRow[];
  reps: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const repName = new Map(reps.map((r) => [r.id, r.name]));

  async function download(doc: DocRow) {
    setBusy(doc.id);
    try {
      const url = await getDownloadUrl(doc.file_path);
      window.open(url, '_blank', 'noopener');
    } catch {
      alert('No se pudo abrir el archivo');
    } finally {
      setBusy(null);
    }
  }

  async function remove(doc: DocRow) {
    if (!confirm(`¿Eliminar "${doc.title}"?`)) return;
    setBusy(doc.id);
    try {
      await deleteDocument(doc.id);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {canManage && (
        <div className="mb-5">
          {open ? (
            <UploadForm reps={reps} onDone={() => { setOpen(false); router.refresh(); }} onCancel={() => setOpen(false)} />
          ) : (
            <button onClick={() => setOpen(true)} className="wsale-btn">Publicar documento</button>
          )}
        </div>
      )}

      {docs.length === 0 ? (
        <p className="text-[13px] text-[var(--ink-soft)] py-8 text-center border border-dashed border-[var(--rule-strong)] rounded-[3px]">
          Todavía no hay documentos publicados.
        </p>
      ) : (
        <ul className="wsale-panel divide-y divide-[var(--rule)]">
          {docs.map((d) => (
            <li key={d.id} className="flex items-start gap-4 p-4">
              <span className="wsale-mono text-[10px] font-medium text-[var(--ink-faint)] border border-[var(--rule-strong)] rounded-[2px] px-1.5 py-1 shrink-0 mt-0.5">
                {kind(d.file_name)}
              </span>

              <div className="flex-1 min-w-0">
                <button
                  onClick={() => download(d)}
                  disabled={busy === d.id}
                  className="text-[14px] text-left hover:text-[var(--accent)] transition disabled:opacity-50"
                >
                  {d.title}
                </button>
                {d.description && (
                  <p className="text-[12px] text-[var(--ink-soft)] mt-0.5">{d.description}</p>
                )}
                <p className="text-[11px] text-[var(--ink-faint)] mt-1">
                  {d.created_at.slice(0, 10)}
                  {d.file_size ? ` · ${kb(d.file_size)}` : ''}
                  {' · '}
                  {d.is_public
                    ? 'Todos los comerciales'
                    : d.audience.map((id) => repName.get(id) ?? '').filter(Boolean).join(', ') || 'Sin destinatarios'}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => download(d)}
                  disabled={busy === d.id}
                  className="text-[12px] text-[var(--accent)] font-medium hover:underline disabled:opacity-50"
                >
                  {busy === d.id ? '…' : 'Descargar'}
                </button>
                {canManage && (
                  <button
                    onClick={() => remove(d)}
                    disabled={busy === d.id}
                    className="text-[12px] text-[var(--ink-faint)] hover:text-[var(--alert)] disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadForm({
  reps, onDone, onCancel,
}: {
  reps: { id: string; name: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [everyone, setEveryone] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (everyone) fd.delete('rep_ids');
    try {
      await uploadDocument(fd);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="wsale-panel p-5 space-y-4 max-w-2xl">
      <label className="block">
        <span className="wsale-overline">Archivo</span>
        <input
          type="file"
          name="file"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="mt-1.5 block w-full text-[12px] file:mr-3 file:h-9 file:px-4 file:rounded-[2px] file:border-0 file:bg-[var(--ink)] file:text-white file:text-[12px] file:font-medium file:cursor-pointer"
        />
        {fileName && <span className="text-[11px] text-[var(--ink-faint)] mt-1 block">{fileName}</span>}
      </label>

      <label className="block">
        <span className="wsale-overline">Título</span>
        <input name="title" required className="wsale-input mt-1.5" placeholder="Ej. Lista de precios septiembre" />
      </label>

      <label className="block">
        <span className="wsale-overline">Descripción</span>
        <input name="description" className="wsale-input mt-1.5" placeholder="Opcional" />
      </label>

      <div>
        <span className="wsale-overline">Quién lo ve</span>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="radio"
              checked={everyone}
              onChange={() => setEveryone(true)}
              className="accent-[var(--accent)]"
            />
            Todos los comerciales
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="radio"
              checked={!everyone}
              onChange={() => setEveryone(false)}
              className="accent-[var(--accent)]"
            />
            Solo algunos
          </label>

          {!everyone && (
            <div className="pl-6 pt-1 space-y-1.5">
              {reps.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    name="rep_ids"
                    value={r.id}
                    checked={picked.includes(r.id)}
                    onChange={(e) =>
                      setPicked((p) => (e.target.checked ? [...p, r.id] : p.filter((x) => x !== r.id)))
                    }
                    className="accent-[var(--accent)]"
                  />
                  {r.name}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <p className="wsale-bad text-[12px]">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="wsale-btn">
          {saving ? 'Subiendo…' : 'Publicar'}
        </button>
        <button type="button" onClick={onCancel} className="wsale-btn-ghost">Cancelar</button>
      </div>
    </form>
  );
}
