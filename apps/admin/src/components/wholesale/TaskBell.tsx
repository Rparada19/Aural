'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { bellStatus, toggleTask, type BellTask } from '@/app/actions/tasks';

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.22);
    });
  } catch { /* sin sonido */ }
}

const hour = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' });

/** Campana del portal: cuenta lo vencido y lo de hoy, y suena a la hora de cada alarma. */
export function TaskBell() {
  const [tasks, setTasks] = useState<BellTask[]>([]);
  const [ringing, setRinging] = useState<BellTask[]>([]);
  const [open, setOpen] = useState(false);
  const [canNotify, setCanNotify] = useState<NotificationPermission | 'none'>('none');
  const busy = useRef(false);

  const check = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await bellStatus();
      setTasks(r.tasks);
      if (r.ring.length) {
        setRinging((prev) => [...prev, ...r.ring]);
        beep();
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          r.ring.forEach((t) => new Notification('Aural · Recordatorio', { body: t.title }));
        }
      }
    } catch { /* se reintenta en el siguiente ciclo */ }
    finally { busy.current = false; }
  }, []);

  useEffect(() => {
    setCanNotify(typeof Notification === 'undefined' ? 'none' : Notification.permission);
    check();
    const id = setInterval(check, 60_000);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [check]);

  const count = tasks.length;
  const late = tasks.some((t) => t.late);

  return (
    <>
      <div className="relative">
        <button onClick={() => setOpen(!open)} aria-label="Pendientes y alarmas"
          className={`relative w-11 h-11 rounded-full grid place-items-center shadow-sm border transition ${count ? (late ? 'bg-[var(--alert)] border-[var(--alert)] text-white' : 'bg-[var(--caution)] border-[var(--caution)] text-white') : 'bg-white border-[var(--rule)] text-[var(--ink-soft)]'} ${ringing.length ? 'animate-bounce' : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          {count > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[var(--ink)] text-white text-[11px] grid place-items-center">{count}</span>}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-80 wsale-panel bg-[var(--paper-raised)] shadow-lg p-4">
            <p className="wsale-overline mb-2">Vencidos, de hoy y alarmas</p>
            {tasks.length === 0 ? (
              <p className="text-[13px] text-[var(--ink-soft)]">Nada pendiente por ahora.</p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1 accent-[var(--accent)]" onChange={async () => { await toggleTask(t.id, true); check(); }} />
                    <div className="text-[13px] leading-snug">
                      {t.title}
                      <span className={`block text-[11px] ${t.late ? 'wsale-bad' : 'text-[var(--ink-faint)]'}`}>
                        {t.late ? `Venció ${t.due_on}` : t.due_on ? 'Vence hoy' : ''}{t.remind_at ? `${t.due_on ? ' · ' : ''}alarma ${hour(t.remind_at)}` : ''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {canNotify === 'default' && (
              <button className="mt-3 text-[12px] text-[var(--accent)]" onClick={async () => setCanNotify(await Notification.requestPermission())}>
                Activar avisos del navegador
              </button>
            )}
            <Link href="/wholesale/pendientes" className="block mt-3 text-[12px] text-[var(--accent)]" onClick={() => setOpen(false)}>Ver todos mis pendientes →</Link>
          </div>
        )}
      </div>

      {ringing.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 w-80 space-y-2">
          {ringing.map((t) => (
            <div key={t.id} className="wsale-panel bg-[var(--paper-raised)] border-l-4 !border-l-[var(--accent)] shadow-lg p-4">
              <p className="wsale-overline mb-1">Recordatorio</p>
              <p className="text-[14px]">{t.title}</p>
              <div className="flex gap-3 mt-2 text-[12px]">
                <button className="text-[var(--accent)] font-semibold" onClick={async () => { await toggleTask(t.id, true); setRinging((r) => r.filter((x) => x.id !== t.id)); check(); }}>Hecho</button>
                <button className="text-[var(--ink-soft)]" onClick={() => setRinging((r) => r.filter((x) => x.id !== t.id))}>Cerrar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
