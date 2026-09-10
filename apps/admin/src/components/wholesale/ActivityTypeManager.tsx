'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createActivityType, setActivityTypeActive } from '@/app/actions/wholesale';
import type { ActivityType } from '@/lib/activities';

export function ActivityTypeManager({ types }: { types: ActivityType[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: '', icon: '📌' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createActivityType({
        slug: form.label,
        label: form.label,
        icon: form.icon || '📌',
        sort_order: (types.at(-1)?.sort_order ?? 100) + 10,
      });
      setForm({ label: '', icon: '📌' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(t: ActivityType) {
    await setActivityTypeActive(t.slug, !t.is_active);
    router.refresh();
  }

  return (
    <div className="mt-6 pt-5 border-t border-[var(--rule)]">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-[var(--ink-soft)] text-xs hover:text-[var(--accent)] transition"
        >
          Administrar tipos de actividad
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
              Tipos de actividad
            </p>
            <button onClick={() => setOpen(false)} className="text-[var(--ink-soft)] text-xs hover:text-[var(--ink)]">
              Cerrar
            </button>
          </div>

          <ul className="space-y-1">
            {types.map((t) => (
              <li key={t.slug} className="flex items-center justify-between text-sm">
                <span className={t.is_active ? '' : 'text-[var(--ink-soft)] line-through'}>
                  {t.icon} {t.label}
                </span>
                <button
                  onClick={() => toggle(t)}
                  className="text-xs text-[var(--ink-soft)] hover:text-[var(--accent)]"
                >
                  {t.is_active ? 'Ocultar' : 'Activar'}
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={add} className="flex gap-2 pt-2">
            <input
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="w-12 h-9 rounded-[2px] border border-[var(--rule)] px-2 text-center outline-none focus:border-[var(--accent)]"
              aria-label="Ícono"
            />
            <input
              required
              placeholder="Nombre del tipo"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="flex-1 h-9 rounded-[2px] border border-[var(--rule)] px-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-3 rounded-[2px] bg-[var(--ink)] text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? '…' : 'Añadir'}
            </button>
          </form>
          {error && <p className="wsale-bad text-xs">{error}</p>}
          <p className="text-[var(--ink-soft)] text-[11px]">
            Ocultar un tipo lo saca de los formularios, pero conserva las actividades ya registradas.
          </p>
        </div>
      )}
    </div>
  );
}
