'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createActivity, setActivityStatus, deleteActivity } from '@/app/actions/wholesale';
import {
  DAY_NAMES, weekDays, monthGrid, formatDayLabel, FALLBACK_ICON,
  type ActivityType, type AgendaView,
} from '@/lib/activities';

export interface Activity {
  id: string;
  kind: string;
  scheduled_on: string;
  starts_at: string | null;
  title: string;
  notes: string | null;
  status: 'planned' | 'done' | 'cancelled';
  client_id: string | null;
}

const STATUS_STYLE = {
  planned: 'border-[var(--rule)]',
  done: 'border-success bg-success/5',
  cancelled: 'border-[var(--rule)] opacity-50 line-through',
} as const;

interface Ctx {
  repId: string;
  types: ActivityType[];
  clients: { id: string; name: string }[];
  today: string;
}

export function Agenda({
  view, anchor, activities, ...ctx
}: Ctx & {
  view: AgendaView;
  anchor: string;
  activities: Activity[];
}) {
  if (view === 'day') return <DayView day={anchor} activities={activities} {...ctx} />;
  if (view === 'month') return <MonthView anchor={anchor} activities={activities} {...ctx} />;
  return <WeekView monday={anchor} activities={activities} {...ctx} />;
}

/* ----------------------------------------------------------------- día */

function DayView({ day, activities, ...ctx }: Ctx & { day: string; activities: Activity[] }) {
  const items = sortByTime(activities.filter((a) => a.scheduled_on === day));
  return (
    <div className="max-w-2xl">
      <DayTotal count={items.length} done={items.filter((a) => a.status === 'done').length} />
      <div className="space-y-2 mt-4">
        {items.length === 0 && (
          <p className="text-[var(--ink-soft)] text-sm">Nada agendado este día.</p>
        )}
        {items.map((a) => (
          <ActivityRow key={a.id} activity={a} {...ctx} wide />
        ))}
      </div>
      <div className="mt-3">
        <AddButton day={day} {...ctx} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- semana */

function WeekView({ monday, activities, ...ctx }: Ctx & { monday: string; activities: Activity[] }) {
  const days = weekDays(monday);
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((day, i) => {
        const items = sortByTime(activities.filter((a) => a.scheduled_on === day));
        const isToday = day === ctx.today;
        return (
          <div
            key={day}
            className={`rounded-[3px] border p-2 min-h-[150px] flex flex-col ${
              isToday ? 'border-primary bg-[rgba(180,85,31,0.05)]' : 'border-[var(--rule)] bg-white'
            }`}
          >
            <div className="flex items-baseline justify-between px-1 mb-2">
              <span className={`text-xs font-semibold ${isToday ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)]'}`}>
                {DAY_NAMES[i].slice(0, 3)}
              </span>
              <span className="flex items-baseline gap-1">
                {items.length > 0 && (
                  <span className="text-[10px] text-[var(--ink-soft)] bg-[var(--paper)] rounded px-1">{items.length}</span>
                )}
                <span className={`text-sm font-semibold ${isToday ? 'text-[var(--accent)]' : 'text-[var(--ink)]'}`}>
                  {formatDayLabel(day)}
                </span>
              </span>
            </div>
            <div className="space-y-2 flex-1">
              {items.map((a) => <ActivityRow key={a.id} activity={a} {...ctx} />)}
            </div>
            <AddButton day={day} {...ctx} />
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- mes */

function MonthView({ anchor, activities, ...ctx }: Ctx & { anchor: string; activities: Activity[] }) {
  const days = monthGrid(anchor);
  const month = anchor.slice(0, 7);
  const byDay = new Map<string, Activity[]>();
  for (const a of activities) {
    if (!byDay.has(a.scheduled_on)) byDay.set(a.scheduled_on, []);
    byDay.get(a.scheduled_on)!.push(a);
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {DAY_NAMES.map((d) => (
          <p key={d} className="text-xs font-semibold text-[var(--ink-soft)] text-center">{d.slice(0, 3)}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const items = byDay.get(day) ?? [];
          const done = items.filter((a) => a.status === 'done').length;
          const outside = !day.startsWith(month);
          const isToday = day === ctx.today;
          return (
            <div
              key={day}
              className={`rounded-[2px] border p-2 min-h-[92px] ${
                isToday ? 'border-primary bg-[rgba(180,85,31,0.05)]'
                : outside ? 'border-[var(--rule)]/50 bg-[var(--paper)]'
                : 'border-[var(--rule)] bg-white'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className={`text-xs font-semibold ${outside ? 'text-[var(--ink-soft)]/60' : isToday ? 'text-[var(--accent)]' : 'text-[var(--ink)]'}`}>
                  {formatDayLabel(day)}
                </span>
                {items.length > 0 && (
                  <span className="text-[10px] font-semibold text-[var(--ink-soft)] bg-[var(--paper)] rounded px-1">
                    {done}/{items.length}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {items.slice(0, 8).map((a) => (
                  <span
                    key={a.id}
                    title={`${a.title}${a.starts_at ? ` · ${a.starts_at.slice(0, 5)}` : ''}`}
                    className={a.status === 'cancelled' ? 'opacity-40' : ''}
                  >
                    {ctx.types.find((t) => t.slug === a.kind)?.icon ?? FALLBACK_ICON}
                  </span>
                ))}
                {items.length > 8 && (
                  <span className="text-[10px] text-[var(--ink-soft)]">+{items.length - 8}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[var(--ink-soft)] text-xs mt-3">
        Cada ícono es una actividad; el contador del día muestra cumplidas sobre agendadas.
        Para agendar, entra a la vista de día o semana.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ compartido */

function sortByTime(items: Activity[]) {
  return [...items].sort((a, b) => (a.starts_at ?? '99').localeCompare(b.starts_at ?? '99'));
}

function DayTotal({ count, done }: { count: number; done: number }) {
  return (
    <p className="text-sm text-[var(--ink-soft)]">
      <span className="text-[var(--ink)] font-semibold">{count}</span> actividad{count === 1 ? '' : 'es'}
      {count > 0 && <> · {done} cumplida{done === 1 ? '' : 's'}</>}
    </p>
  );
}

function ActivityRow({
  activity: a, repId, types, clients, wide,
}: Ctx & { activity: Activity; wide?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const type = types.find((t) => t.slug === a.kind);
  const clientName = clients.find((c) => c.id === a.client_id)?.name;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); router.refresh(); } finally { setBusy(false); }
  }

  return (
    <div className={`rounded-[2px] border p-2 ${wide ? 'text-sm' : 'text-xs'} ${STATUS_STYLE[a.status]}`}>
      <div className="flex items-start gap-2">
        <span aria-hidden title={type?.label}>{type?.icon ?? FALLBACK_ICON}</span>
        <span className="flex-1 leading-snug">{a.title}</span>
        {wide && a.starts_at && <span className="text-[var(--ink-soft)]">{a.starts_at.slice(0, 5)}</span>}
      </div>
      {!wide && a.starts_at && <p className="text-[var(--ink-soft)] mt-1">{a.starts_at.slice(0, 5)}</p>}
      {clientName && <p className="text-[var(--ink-soft)] truncate">{clientName}</p>}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => run(() => setActivityStatus(a.id, repId, a.status === 'done' ? 'planned' : 'done'))}
          disabled={busy}
          className="text-[var(--accent)] font-medium hover:underline disabled:opacity-50"
        >
          {a.status === 'done' ? 'Deshacer' : 'Cumplida'}
        </button>
        <button
          onClick={() => run(() => deleteActivity(a.id, repId))}
          disabled={busy}
          className="text-[var(--ink-soft)] hover:wsale-bad disabled:opacity-50"
        >
          Borrar
        </button>
      </div>
    </div>
  );
}

function AddButton({ day, repId, types, clients }: Ctx & { day: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-[var(--ink-soft)] hover:text-[var(--accent)] transition"
      >
        + Agendar
      </button>
    );
  }
  return (
    <NewActivity
      repId={repId}
      day={day}
      types={types}
      clients={clients}
      onDone={() => { setOpen(false); router.refresh(); }}
      onCancel={() => setOpen(false)}
    />
  );
}

function NewActivity({
  repId, day, types, clients, onDone, onCancel,
}: {
  repId: string;
  day: string;
  types: ActivityType[];
  clients: { id: string; name: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    kind: types[0]?.slug ?? '', title: '', starts_at: '', client_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createActivity({
        rep_id: repId,
        kind: form.kind,
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

  const field = 'w-full h-8 rounded-[2px] border border-[var(--rule)] px-1 text-xs outline-none focus:border-[var(--accent)]';

  return (
    <form onSubmit={submit} className="mt-2 space-y-1">
      <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={field}>
        {types.map((t) => <option key={t.slug} value={t.slug}>{t.icon} {t.label}</option>)}
      </select>
      <input
        required autoFocus placeholder="¿Qué es?"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className={field}
      />
      <input
        type="time" value={form.starts_at}
        onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
        className={field}
      />
      <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className={field}>
        <option value="">Sin cliente</option>
        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {error && <p className="wsale-bad text-[10px]">{error}</p>}
      <div className="flex gap-1">
        <button type="submit" disabled={saving} className="flex-1 h-8 rounded-[2px] bg-[var(--ink)] text-white text-xs font-semibold disabled:opacity-50">
          {saving ? '…' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel} className="h-8 px-2 rounded-[2px] border border-[var(--rule)] text-xs">✕</button>
      </div>
    </form>
  );
}
