'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveActivityTargets } from '@/app/actions/wholesale';
import { type ActivityType } from '@/lib/activities';

export interface KindCount { kind: string; target: number; doneCount: number; plannedCount: number }

export function ActivityTargets({
  repId, year, month, rows, types, canEdit,
}: {
  repId: string;
  year: number;
  month: number;
  rows: KindCount[];
  types: ActivityType[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(rows.map((r) => [r.kind, r.target])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveActivityTargets(
        repId, year, month,
        types.map((t) => ({ kind: t.slug, target: Number(values[t.slug]) || 0 })),
      );
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {types.map((k) => {
        const row = rows.find((r) => r.kind === k.slug) ?? { target: 0, doneCount: 0, plannedCount: 0 };
        const ratio = row.target > 0 ? row.doneCount / row.target : null;
        const width = row.target > 0 ? Math.min((row.doneCount / row.target) * 100, 100) : 0;
        return (
          <div key={k.slug}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2">
                <span aria-hidden>{k.icon}</span>
                {k.label}
              </span>
              {editing ? (
                <input
                  type="number"
                  min="0"
                  value={values[k.slug] ?? 0}
                  onChange={(e) => setValues({ ...values, [k.slug]: Number(e.target.value) })}
                  className="w-16 h-8 rounded-[2px] border border-[var(--rule)] px-2 text-sm text-right outline-none focus:border-[var(--accent)]"
                />
              ) : (
                <span className="text-[var(--ink-soft)] text-xs">
                  <span className="text-[var(--ink)] font-semibold">{row.doneCount}</span>
                  {row.target > 0 ? ` / ${row.target}` : ''}
                  {row.plannedCount > 0 && ` · ${row.plannedCount} por hacer`}
                </span>
              )}
            </div>
            {!editing && (
              <div className="mt-1 wsale-meter">
                <div
                  className={`h-full ${
                    ratio === null ? 'bg-[var(--rule)]' : ratio >= 1 ? 'bg-[var(--positive)]' : 'bg-[var(--ink)]'
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
            )}
          </div>
        );
      })}

      {error && <p className="wsale-bad text-xs">{error}</p>}

      {canEdit && (
        editing ? (
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="h-9 px-4 rounded-[2px] bg-[var(--ink)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? 'Guardando…' : 'Guardar metas'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="h-9 px-4 rounded-[2px] border border-[var(--rule)] text-sm hover:bg-[rgba(16,35,63,0.04)] transition"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-[var(--accent)] text-sm font-semibold hover:underline pt-1"
          >
            Definir metas del mes
          </button>
        )
      )}
    </div>
  );
}
