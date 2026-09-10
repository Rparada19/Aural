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
  pending: 'bg-[var(--paper)] text-[var(--ink-soft)]',
  in_progress: 'bg-warning/10 wsale-warn',
  done: 'bg-success/10 wsale-good',
  dropped: 'bg-danger/10 wsale-bad',
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
    <div className="border border-[var(--rule)] rounded-[3px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{title}</p>
          {subtitle && <p className="text-[var(--ink-soft)] text-xs mt-0.5">{subtitle}</p>}
        </div>
        <span className={`shrink-0 text-xs px-2 py-1 rounded-[2px] font-semibold ${STATUS_STYLE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {meta && <p className="text-[var(--ink-soft)] text-xs mt-2">{meta}</p>}

      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 wsale-meter">
          <div
            className={`h-full ${progress >= 100 ? 'bg-[var(--positive)]' : 'bg-[var(--ink)]'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-semibold w-10 text-right">{progress}%</span>
      </div>

      {note && !open && <p className="text-[var(--ink-soft)] text-xs mt-2 italic">“{note}”</p>}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 text-[var(--accent)] text-sm font-semibold hover:underline"
        >
          Dar avance
        </button>
      ) : (
        <div className="mt-4 space-y-3 border-t border-[var(--rule)] pt-3">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="flex-1 accent-[var(--accent)]"
            />
            <span className="text-sm font-semibold w-12 text-right">{value}%</span>
          </div>

          <select
            value={state}
            onChange={(e) => setState(e.target.value as GoalStatus)}
            className="w-full h-10 rounded-[2px] border border-[var(--rule)] px-2 text-sm outline-none focus:border-[var(--accent)]"
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
            className="w-full rounded-[2px] border border-[var(--rule)] p-2 text-sm outline-none focus:border-[var(--accent)]"
          />

          {error && <p className="wsale-bad text-xs">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="wsale-btn"
            >
              {saving ? 'Guardando…' : 'Guardar avance'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="wsale-btn-ghost"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
