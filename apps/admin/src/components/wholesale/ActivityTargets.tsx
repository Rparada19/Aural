'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveActivityTargets } from '@/app/actions/wholesale';
import { ACTIVITY_KINDS, type ActivityKind } from '@/lib/activities';

export interface KindCount { kind: ActivityKind; target: number; doneCount: number; plannedCount: number }

export function ActivityTargets({
  repId, year, month, rows, canEdit,
}: {
  repId: string;
  year: number;
  month: number;
  rows: KindCount[];
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
        ACTIVITY_KINDS.map((k) => ({ kind: k.kind, target: Number(values[k.kind]) || 0 })),
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
      {ACTIVITY_KINDS.map((k) => {
        const row = rows.find((r) => r.kind === k.kind) ?? { target: 0, doneCount: 0, plannedCount: 0 };
        const ratio = row.target > 0 ? row.doneCount / row.target : null;
        const width = row.target > 0 ? Math.min((row.doneCount / row.target) * 100, 100) : 0;
        return (
          <div key={k.kind}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2">
                <span aria-hidden>{k.icon}</span>
                {k.short}
              </span>
              {editing ? (
                <input
                  type="number"
                  min="0"
                  value={values[k.kind] ?? 0}
                  onChange={(e) => setValues({ ...values, [k.kind]: Number(e.target.value) })}
                  className="w-16 h-8 rounded-md border border-border px-2 text-sm text-right outline-none focus:border-primary"
                />
              ) : (
                <span className="text-secondary text-xs">
                  <span className="text-foreground font-semibold">{row.doneCount}</span>
                  {row.target > 0 ? ` / ${row.target}` : ''}
                  {row.plannedCount > 0 && ` · ${row.plannedCount} por hacer`}
                </span>
              )}
            </div>
            {!editing && (
              <div className="mt-1 h-2 rounded-full bg-surface overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    ratio === null ? 'bg-border' : ratio >= 1 ? 'bg-success' : 'bg-primary'
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
            )}
          </div>
        );
      })}

      {error && <p className="text-danger text-xs">{error}</p>}

      {canEdit && (
        editing ? (
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              disabled={saving}
              className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-soft disabled:opacity-50 transition"
            >
              {saving ? 'Guardando…' : 'Guardar metas'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="h-9 px-4 rounded-lg border border-border text-sm hover:bg-surface transition"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-primary text-sm font-semibold hover:underline pt-1"
          >
            Definir metas del mes
          </button>
        )
      )}
    </div>
  );
}
