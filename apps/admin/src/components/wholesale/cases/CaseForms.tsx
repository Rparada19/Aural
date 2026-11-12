'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCase, updateCase, takeCase, addCaseNote } from '@/app/actions/cases';
import { CASE_KIND, CASE_STATUS, PRIORITY } from '@/lib/cases';

type Opt = { id: string; name: string };

export function NewCase({ clients, presetClient, label = 'Nuevo caso' }: { clients: Opt[]; presetClient?: string; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [q, setQ] = useState('');
  const [f, setF] = useState({ client_id: presetClient ?? '', kind: '', priority: 'media', subject: '', description: '', patient_name: '', serial: '' });
  const matches = q ? clients.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const chosen = clients.find((c) => c.id === f.client_id);

  async function save() {
    if (!f.kind) { setError('Elige el tipo de caso'); return; }
    setBusy(true); setError(null);
    try {
      const id = await createCase(f);
      router.push(`/wholesale/casos/${id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar'); setBusy(false); }
  }

  if (!open) return <button className="wsale-btn" onClick={() => setOpen(true)}>{label}</button>;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center overflow-y-auto p-6" onClick={() => !busy && setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="wsale-panel bg-[var(--paper-raised)] p-6 w-full max-w-xl space-y-6 mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="wsale-display text-[20px]">Nuevo caso</h2>
          <button className="text-[12px] text-[var(--ink-soft)]" onClick={() => setOpen(false)}>Cerrar</button>
        </div>

        <div>
          <p className="text-[13px] font-semibold mb-2">1. ¿Qué cliente?</p>
          {chosen ? (
            <div className="flex items-center justify-between wsale-input !h-auto py-2.5">
              <span>{chosen.name}</span>
              {!presetClient && <button className="text-[12px] text-[var(--accent)]" onClick={() => setF((s) => ({ ...s, client_id: '' }))}>Cambiar</button>}
            </div>
          ) : (
            <>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} className="wsale-input" placeholder="Escribe el nombre del centro" />
              {matches.length > 0 && (
                <div className="border border-[var(--rule)] border-t-0 rounded-b-[2px] bg-white">
                  {matches.map((c) => (
                    <button key={c.id} className="block w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--paper)]" onClick={() => { setF((s) => ({ ...s, client_id: c.id })); setQ(''); }}>{c.name}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <p className="text-[13px] font-semibold mb-2">2. ¿Qué tipo de caso es?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(CASE_KIND).map(([k, v]) => (
              <button key={k} onClick={() => setF((s) => ({ ...s, kind: k }))}
                className={`py-3 px-2 text-[13px] border rounded-[3px] transition ${f.kind === k ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--rule)] hover:border-[var(--accent)]'}`}>{v.label}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[13px] font-semibold mb-2">3. ¿Qué necesita el cliente?</p>
          <input value={f.subject} onChange={(e) => setF((s) => ({ ...s, subject: e.target.value }))} className="wsale-input" placeholder="Ej. Audífono no enciende, revisar garantía" />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[13px] font-semibold mr-1">4. Urgencia:</span>
          {Object.entries(PRIORITY).map(([k, v]) => (
            <button key={k} className="wsale-chip" data-on={f.priority === k} onClick={() => setF((s) => ({ ...s, priority: k }))}>{v}</button>
          ))}
        </div>

        {more ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={f.patient_name} onChange={(e) => setF((s) => ({ ...s, patient_name: e.target.value }))} className="wsale-input" placeholder="Paciente (opcional)" />
              <input value={f.serial} onChange={(e) => setF((s) => ({ ...s, serial: e.target.value }))} className="wsale-input" placeholder="Serial (opcional)" />
            </div>
            <textarea value={f.description} onChange={(e) => setF((s) => ({ ...s, description: e.target.value }))} rows={3} placeholder="Detalles (opcional)"
              className="w-full rounded-[2px] border border-[var(--rule)] bg-white p-3 text-[13px] outline-none focus:border-[var(--accent)]" />
          </div>
        ) : (
          <button className="text-[12px] text-[var(--accent)]" onClick={() => setMore(true)}>+ Agregar paciente, serial o detalles</button>
        )}

        {error && <p className="wsale-bad text-[13px]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className="wsale-btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
          <button className="wsale-btn" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Crear caso'}</button>
        </div>
      </div>
    </div>
  );
}

/** Siguiente paso natural de cada estado: un botón grande, lo demás a un lado. */
const NEXT: Record<string, { to: string; label: string }[]> = {
  abierto: [{ to: 'en_proceso', label: 'Empezar a trabajarlo' }],
  en_proceso: [{ to: 'resuelto', label: 'Marcar como resuelto' }, { to: 'esperando_cliente', label: 'Esperando al cliente' }, { to: 'esperando_fabrica', label: 'Esperando fábrica' }],
  esperando_cliente: [{ to: 'en_proceso', label: 'El cliente respondió' }, { to: 'resuelto', label: 'Marcar como resuelto' }],
  esperando_fabrica: [{ to: 'en_proceso', label: 'Llegó de fábrica' }, { to: 'resuelto', label: 'Marcar como resuelto' }],
  resuelto: [{ to: 'cerrado', label: 'Cerrar caso' }, { to: 'en_proceso', label: 'Reabrir' }],
  cerrado: [{ to: 'en_proceso', label: 'Reabrir' }],
};

export function CaseActions({
  id, status, mine, assignedTo, priority, dueOn, people,
}: { id: string; status: string; mine: boolean; assignedTo: string | null; priority: string; dueOn: string | null; people: Opt[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); setNote(''); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar'); }
    finally { setBusy(false); }
  }
  const steps = NEXT[status] ?? [];

  return (
    <div className="space-y-5">
      <section className="wsale-panel p-5 space-y-4">
        <p className="wsale-overline">¿Qué pasó?</p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
          placeholder="Cuenta el avance: con quién hablaste, qué se acordó, qué falta."
          className="w-full rounded-[2px] border border-[var(--rule)] bg-white p-3 text-[13px] outline-none focus:border-[var(--accent)]" />
        <div className="flex flex-wrap gap-2">
          {!assignedTo && (
            <button className="wsale-btn" disabled={busy} onClick={() => run(() => takeCase(id))}>Tomar este caso</button>
          )}
          {steps.map((s, i) => (
            <button key={s.to} disabled={busy} className={i === 0 && assignedTo ? 'wsale-btn' : 'wsale-btn-ghost'}
              onClick={() => run(() => updateCase(id, { status: s.to }, note || `Cambió a: ${CASE_STATUS[s.to]}`))}>{s.label}</button>
          ))}
          {note.trim() && (
            <button className="wsale-btn-ghost" disabled={busy} onClick={() => run(() => addCaseNote(id, note))}>Solo guardar nota</button>
          )}
        </div>
        {error && <p className="wsale-bad text-[12px]">{error}</p>}
      </section>

      <section className="wsale-panel p-5 grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="wsale-overline">Responsable</span>
          <select disabled={busy} value={assignedTo ?? ''} className="wsale-input mt-1"
            onChange={(e) => {
              const p = people.find((x) => x.id === e.target.value);
              run(() => updateCase(id, { assigned_to: p?.id ?? null, assigned_name: p?.name ?? null }, p ? `Asignado a ${p.name}.` : 'Quedó sin responsable.'));
            }}>
            <option value="">Sin responsable</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}{mine && p.id === assignedTo ? ' (tú)' : ''}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="wsale-overline">Urgencia</span>
          <select disabled={busy} value={priority} className="wsale-input mt-1" onChange={(e) => run(() => updateCase(id, { priority: e.target.value }))}>
            {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="wsale-overline">Fecha compromiso</span>
          <input type="date" disabled={busy} defaultValue={dueOn ?? ''} className="wsale-input mt-1"
            onBlur={(e) => e.target.value !== (dueOn ?? '') && run(() => updateCase(id, { due_on: e.target.value || null }, `Nueva fecha compromiso: ${e.target.value}`))} />
        </label>
      </section>
    </div>
  );
}
