'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateGoalProgress, updateProjectProgress } from '@/app/actions/wholesale';

export type GoalStatus = 'pending' | 'in_progress' | 'done' | 'dropped';

const STATUS_LABEL: Record<GoalStatus, string> = {
  pending: 'Por empezar',
  in_progress: 'En curso',
  done: 'Cumplido',
  dropped: 'Descartado',
};

const STATUS_STYLE: Record<GoalStatus, string> = {
  pending: 'bg-surface text-secondary',
  in_progress: 'bg-warning/10 text-warning',
  done: 'bg-success/10 text-success',
  dropped: 'bg-danger/10 text-danger',
};

export function ProgressCard({
  kind, id, repId, title, subtitle, meta, progress, status, note,
}: {
  kind: 'goal' | 'project';
  id: string;
  repId: string;
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  progress: number;
  status: GoalStatus;
  note?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(progress);
  const [state, setState] = useState<GoalStatus>(status);
  const [text, setText] = useState(note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const patch = { progress_percent: value, status: state, progress_note: text };
      if (kind === 'goal') await updateGoalProgress(id, repId, patch);
      else await updateProjectProgress(id, repId, patch);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{title}</p>
          {subtitle && <p className="text-secondary text-xs mt-0.5">{subtitle}</p>}
        </div>
        <span className={`shrink-0 text-xs px-2 py-1 rounded-md font-semibold ${STATUS_STYLE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {meta && <p className="text-secondary text-xs mt-2">{meta}</p>}

      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
          <div
            className={`h-full rounded-full ${progress >= 100 ? 'bg-success' : 'bg-primary'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-semibold w-10 text-right">{progress}%</span>
      </div>

      {note && !open && <p className="text-secondary text-xs mt-2 italic">“{note}”</p>}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 text-primary text-sm font-semibold hover:underline"
        >
          Dar avance
        </button>
      ) : (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="flex-1 accent-[var(--primary)]"
            />
            <span className="text-sm font-semibold w-12 text-right">{value}%</span>
          </div>

          <select
            value={state}
            onChange={(e) => setState(e.target.value as GoalStatus)}
            className="w-full h-10 rounded-lg border border-border px-2 text-sm outline-none focus:border-primary"
          >
            {(Object.keys(STATUS_LABEL) as GoalStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="¿Qué pasó desde la última vez?"
            className="w-full rounded-lg border border-border p-2 text-sm outline-none focus:border-primary"
          />

          {error && <p className="text-danger text-xs">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-soft disabled:opacity-50 transition"
            >
              {saving ? 'Guardando…' : 'Guardar avance'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-surface transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
