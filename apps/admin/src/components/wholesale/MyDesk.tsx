'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addTask, toggleTask, deleteTask, saveNotepad } from '@/app/actions/tasks';

export interface Task { id: string; title: string; due_on: string | null; remind_at: string | null; done_at: string | null; created_by_name: string | null; mine: boolean }

const today = () => new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);

function dueLabel(d: string | null) {
  if (!d) return null;
  const t = today();
  if (d < t) return { text: `Venció ${d}`, cls: 'wsale-bad' };
  if (d === t) return { text: 'Hoy', cls: 'wsale-warn' };
  return { text: d, cls: 'text-[var(--ink-faint)]' };
}

export function MyDesk({
  tasks, notepad, people = [], myName,
}: { tasks: Task[]; notepad: string; people?: { id: string; name: string }[]; myName: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<'tareas' | 'notas'>('tareas');
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [owner, setOwner] = useState('');
  const [alarm, setAlarm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(notepad);
  const [saved, setSaved] = useState<'ok' | 'saving' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function onNote(v: string) {
    setNote(v); setSaved('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => { await saveNotepad(v).catch(() => null); setSaved('ok'); }, 800);
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); router.refresh(); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar'); return false; }
    finally { setBusy(false); }
  }

  const open = tasks.filter((t) => !t.done_at).sort((a, b) => (a.due_on ?? '9999').localeCompare(b.due_on ?? '9999'));
  const done = tasks.filter((t) => t.done_at);

  return (
    <section className="wsale-panel p-5">
      <div className="flex gap-4 border-b border-[var(--rule)] mb-4">
        {(['tareas', 'notas'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className={`pb-2 -mb-px text-[13px] border-b-2 ${tab === k ? 'border-[var(--accent)] text-[var(--ink)] font-semibold' : 'border-transparent text-[var(--ink-soft)]'}`}>
            {k === 'tareas' ? `Mis pendientes${open.length ? ` · ${open.length}` : ''}` : 'Bloc de notas'}
          </button>
        ))}
      </div>

      {tab === 'tareas' ? (
        <div className="space-y-3">
          <form className="space-y-2" onSubmit={(e) => {
            e.preventDefault();
            const remind_at = alarm ? new Date(`${due || today()}T${alarm}:00-05:00`).toISOString() : null;
            run(() => addTask({ title, due_on: due || (alarm ? today() : null), owner_id: owner || null, remind_at }))
              .then((ok) => { if (ok) { setTitle(''); setDue(''); setAlarm(''); setOwner(''); } });
          }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="wsale-input" placeholder="¿Qué tienes pendiente?" />
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <label className="block">
                <span className="text-[11px] text-[var(--ink-soft)]">Vence</span>
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="wsale-input !h-9 text-[12px]" />
              </label>
              <label className="block">
                <span className="text-[11px] text-[var(--ink-soft)] flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                  Alarma
                </span>
                <input type="time" value={alarm} onChange={(e) => setAlarm(e.target.value)} className="wsale-input !h-9 text-[12px]" />
              </label>
              <button className="wsale-btn !h-9" disabled={busy || !title.trim()}>Agregar</button>
            </div>
            {people.length > 0 && title.trim() && (
              <select value={owner} onChange={(e) => setOwner(e.target.value)} className="wsale-input !h-9 text-[12px]">
                <option value="">Para mí</option>
                {people.map((p) => <option key={p.id} value={p.id}>Para {p.name}</option>)}
              </select>
            )}
          </form>

          {open.length === 0 ? (
            <p className="text-[13px] text-[var(--ink-soft)] py-2">Sin pendientes. Anota aquí lo que no quieres olvidar.</p>
          ) : (
            <ul className="divide-y divide-[var(--rule)]">
              {open.map((t) => {
                const d = dueLabel(t.due_on);
                return (
                  <li key={t.id} className="flex items-start gap-3 py-2 group">
                    <input type="checkbox" className="mt-1 w-4 h-4 accent-[var(--accent)] cursor-pointer" disabled={busy} onChange={() => run(() => toggleTask(t.id, true))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-snug flex items-center gap-1.5">
                        {(d?.cls === 'wsale-bad' || d?.cls === 'wsale-warn') && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={d.cls}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                        )}
                        {t.title}
                      </p>
                      <p className="text-[11px]">
                        {d && <span className={d.cls}>{d.text}</span>}
                        {t.remind_at && <span className="text-[var(--ink-faint)]">{d ? ' · ' : ''}alarma {new Date(t.remind_at).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' })}</span>}
                        {!t.mine ? null : t.created_by_name && t.created_by_name !== myName && (
                          <span className="text-[var(--ink-faint)]">{d ? ' · ' : ''}te lo asignó {t.created_by_name}</span>
                        )}
                      </p>
                    </div>
                    <button className="text-[11px] text-[var(--ink-faint)] opacity-0 group-hover:opacity-100 hover:text-[var(--alert)]" onClick={() => run(() => deleteTask(t.id))}>Quitar</button>
                  </li>
                );
              })}
            </ul>
          )}

          {done.length > 0 && (
            <details>
              <summary className="text-[12px] text-[var(--ink-soft)] cursor-pointer">Hechos · {done.length}</summary>
              <ul className="mt-2 space-y-1">
                {done.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 text-[12px] text-[var(--ink-faint)]">
                    <input type="checkbox" checked readOnly className="w-3.5 h-3.5 accent-[var(--accent)] cursor-pointer" onClick={() => run(() => toggleTask(t.id, false))} />
                    <span className="line-through flex-1">{t.title}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {error && <p className="wsale-bad text-[12px]">{error}</p>}
        </div>
      ) : (
        <div>
          <textarea value={note} onChange={(e) => onNote(e.target.value)} rows={10}
            placeholder="Tus notas: ideas, recordatorios, datos que no quieres perder. Solo tú las ves."
            className="w-full rounded-[2px] border border-[var(--rule)] bg-[#fffdf6] p-3 text-[13px] leading-relaxed outline-none focus:border-[var(--accent)]" />
          <p className="text-[11px] text-[var(--ink-faint)] mt-1 h-4">{saved === 'saving' ? 'Guardando…' : saved === 'ok' ? 'Guardado' : 'Se guarda solo'}</p>
        </div>
      )}
    </section>
  );
}
