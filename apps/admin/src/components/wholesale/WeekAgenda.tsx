'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createActivity, setActivityStatus, deleteActivity } from '@/app/actions/wholesale';
import {
  ACTIVITY_KINDS, KIND_ICON, KIND_LABEL, DAY_NAMES, weekDays, formatDayLabel,
  type ActivityKind,
} from '@/lib/activities';

export interface Activity {
  id: string;
  kind: ActivityKind;
  scheduled_on: string;
  starts_at: string | null;
  title: string;
  notes: string | null;
  status: 'planned' | 'done' | 'cancelled';
  client_id: string | null;
}

const STATUS_STYLE = {
  planned: 'border-border',
  done: 'border-success bg-success/5',
  cancelled: 'border-border opacity-50 line-through',
} as const;

export function WeekAgenda({
  repId, monday, activities, clients, today,
}: {
  repId: string;
  monday: string;
  activities: Activity[];
  clients: { id: string; name: string }[];
  today: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const days = weekDays(monday);
  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  async function toggle(a: Activity) {
    setBusy(a.id);
    try {
      await setActivityStatus(a.id, repId, a.status === 'done' ? 'planned' : 'done');
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove(a: Activity) {
    setBusy(a.id);
    try {
      await deleteActivity(a.id, repId);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((day, i) => {
        const items = activities
          .filter((a) => a.scheduled_on === day)
          .sort((a, b) => (a.starts_at ?? '99').localeCompare(b.starts_at ?? '99'));
        const isToday = day === today;
        return (
          <div
            key={day}
            className={`rounded-xl border p-2 min-h-[150px] flex flex-col ${
              isToday ? 'border-primary bg-primary/5' : 'border-border bg-white'
            }`}
          >
            <div className="flex items-baseline justify-between px-1 mb-2">
              <span className={`text-xs font-semibold ${isToday ? 'text-primary' : 'text-secondary'}`}>
                {DAY_NAMES[i].slice(0, 3)}
              </span>
              <span className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                {formatDayLabel(day)}
              </span>
            </div>

            <div className="space-y-2 flex-1">
              {items.map((a) => (
                <div key={a.id} className={`rounded-lg border p-2 text-xs ${STATUS_STYLE[a.status]}`}>
                  <div className="flex items-start gap-1">
                    <span aria-hidden title={KIND_LABEL[a.kind]}>{KIND_ICON[a.kind]}</span>
                    <span className="flex-1 leading-snug">{a.title}</span>
                  </div>
                  {a.starts_at && <p className="text-secondary mt-1">{a.starts_at.slice(0, 5)}</p>}
                  {a.client_id && (
                    <p className="text-secondary truncate">{clientName.get(a.client_id)}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => toggle(a)}
                      disabled={busy === a.id}
                      className="text-primary font-semibold hover:underline disabled:opacity-50"
                    >
                      {a.status === 'done' ? 'Deshacer' : 'Cumplida'}
                    </button>
                    <button
                      onClick={() => remove(a)}
                      disabled={busy === a.id}
                      className="text-secondary hover:text-danger disabled:opacity-50"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {adding === day ? (
              <NewActivity
                repId={repId}
                day={day}
                clients={clients}
                onDone={() => { setAdding(null); router.refresh(); }}
                onCancel={() => setAdding(null)}
              />
            ) : (
              <button
                onClick={() => setAdding(day)}
                className="mt-2 text-xs text-secondary hover:text-primary transition"
              >
                + Agendar
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NewActivity({
  repId, day, clients, onDone, onCancel,
}: {
  repId: string;
  day: string;
  clients: { id: string; name: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ kind: 'presencial', title: '', starts_at: '', client_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createActivity({
        rep_id: repId,
        kind: form.kind as ActivityKind,
        scheduled_on: day,
        starts_at: form.starts_at || null,
        title: form.title,
        client_id: form.client_id || null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      setSaving(false);
    }
  }

  const field = 'w-full h-8 rounded-md border border-border px-1 text-xs outline-none focus:border-primary';

  return (
    <form onSubmit={submit} className="mt-2 space-y-1">
      <select
        value={form.kind}
        onChange={(e) => setForm({ ...form, kind: e.target.value })}
        className={field}
      >
        {ACTIVITY_KINDS.map((k) => (
          <option key={k.kind} value={k.kind}>{k.icon} {k.label}</option>
        ))}
      </select>
      <input
        required
        autoFocus
        placeholder="¿Qué es?"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className={field}
      />
      <input
        type="time"
        value={form.starts_at}
        onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
        className={field}
      />
      <select
        value={form.client_id}
        onChange={(e) => setForm({ ...form, client_id: e.target.value })}
        className={field}
      >
        <option value="">Sin cliente</option>
        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {error && <p className="text-danger text-[10px]">{error}</p>}
      <div className="flex gap-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 h-8 rounded-md bg-primary text-white text-xs font-semibold disabled:opacity-50"
        >
          {saving ? '…' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel} className="h-8 px-2 rounded-md border border-border text-xs">
          ✕
        </button>
      </div>
    </form>
  );
}
