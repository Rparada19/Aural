'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  setStage, updateOpportunity, convertToClient, deleteOpportunity,
  saveContact, deleteContact, logInteraction, deleteInteraction,
} from '@/app/actions/crm';
import {
  STAGES, STAGE_LABEL, KIND_LABEL, SOURCES, LOST_REASONS, INTERACTION_LABEL, OUTCOME_LABEL,
  INFLUENCE_LABEL, SENTIMENT_LABEL, today, type Stage,
} from '@/lib/crm';
import { Field } from '../Field';

type Opt = { id: string; name: string };

function useRun() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); router.refresh(); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar'); return false; }
    finally { setBusy(false); }
  }
  return { busy, error, run, router };
}

export function StageBar({ id, stage }: { id: string; stage: Stage }) {
  const { busy, error, run } = useRun();
  const [losing, setLosing] = useState(false);
  const idx = STAGES.indexOf(stage);
  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-1">
        {STAGES.filter((s) => s !== 'perdido').map((s, i) => {
          const done = stage !== 'perdido' && i <= idx;
          return (
            <button
              key={s} disabled={busy}
              onClick={() => run(() => setStage(id, s))}
              className={`px-3 py-2 text-[12px] border rounded-[2px] transition ${done ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--rule)] text-[var(--ink-soft)] hover:border-[var(--accent)]'}`}
            >{STAGE_LABEL[s]}</button>
          );
        })}
        {losing ? (
          <select
            autoFocus className="wsale-input !h-9 !w-auto text-[12px]" defaultValue=""
            onChange={(e) => e.target.value && run(() => setStage(id, 'perdido', { lost_reason: e.target.value })).then(() => setLosing(false))}
          >
            <option value="">¿Por qué se perdió?</option>
            {LOST_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        ) : (
          <button
            onClick={() => setLosing(true)}
            className={`px-3 py-2 text-[12px] border rounded-[2px] ${stage === 'perdido' ? 'bg-[var(--alert)] text-white border-[var(--alert)]' : 'border-[var(--rule)] text-[var(--ink-soft)] hover:border-[var(--alert)]'}`}
          >Perdido</button>
        )}
      </div>
      {error && <p className="wsale-bad text-[12px] mt-2">{error}</p>}
    </div>
  );
}

export interface OppData {
  id: string; name: string; kind: string; rep_id: string | null; client_id: string | null;
  city: string | null; zone: string | null; source: string | null; nit: string | null;
  phone: string | null; email: string | null; stage: Stage;
  est_units: number | null; est_amount: number | null; probability: number | null;
  expected_close: string | null; next_action: string | null; next_action_on: string | null;
  notes: string | null;
}

export function OppDetails({ o, reps, isCoordination }: { o: OppData; reps: Opt[]; isCoordination: boolean }) {
  const { busy, error, run, router } = useRun();
  const [f, setF] = useState({
    name: o.name, kind: o.kind, rep_id: o.rep_id ?? '', city: o.city ?? '', zone: o.zone ?? '',
    source: o.source ?? '', nit: o.nit ?? '', phone: o.phone ?? '', email: o.email ?? '',
    est_units: o.est_units?.toString() ?? '', est_amount: o.est_amount?.toString() ?? '',
    probability: o.probability?.toString() ?? '', expected_close: o.expected_close ?? '',
    next_action: o.next_action ?? '', next_action_on: o.next_action_on ?? '', notes: o.notes ?? '',
  });
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setSaved(false); setF((s) => ({ ...s, [k]: e.target.value }));
  };
  const save = () => run(() => updateOpportunity(o.id, {
    ...f,
    est_units: f.est_units ? Number(f.est_units) : null,
    est_amount: f.est_amount ? Number(f.est_amount) : null,
    probability: f.probability ? Number(f.probability) : null,
    expected_close: f.expected_close || null,
    next_action_on: f.next_action_on || null,
  })).then((ok) => ok && setSaved(true));

  return (
    <div className="space-y-5">
      <section className="wsale-panel p-5 space-y-4 border-l-2 !border-l-[var(--accent)]">
        <p className="wsale-overline">Próxima acción</p>
        <input value={f.next_action} onChange={set('next_action')} className="wsale-input" placeholder="¿Qué sigue?" />
        <input type="date" value={f.next_action_on} onChange={set('next_action_on')} className="wsale-input" />
      </section>

      <section className="wsale-panel p-5 space-y-4">
        <p className="wsale-overline">Datos del negocio</p>
        <Field label="Nombre"><input value={f.name} onChange={set('name')} className="wsale-input" /></Field>
        <Field label="Tipo">
          <select value={f.kind} onChange={set('kind')} className="wsale-input">
            {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidades/año"><input type="number" value={f.est_units} onChange={set('est_units')} className="wsale-input" /></Field>
          <Field label="Valor/año"><input type="number" value={f.est_amount} onChange={set('est_amount')} className="wsale-input" /></Field>
          <Field label="Probabilidad %"><input type="number" min="0" max="100" value={f.probability} onChange={set('probability')} className="wsale-input" /></Field>
          <Field label="Cierre probable"><input type="date" value={f.expected_close} onChange={set('expected_close')} className="wsale-input" /></Field>
        </div>
        {isCoordination && (
          <Field label="Comercial">
            <select value={f.rep_id} onChange={set('rep_id')} className="wsale-input">
              <option value="">Sin asignar</option>
              {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ciudad"><input value={f.city} onChange={set('city')} className="wsale-input" /></Field>
          <Field label="Zona"><input value={f.zone} onChange={set('zone')} className="wsale-input" /></Field>
          <Field label="NIT"><input value={f.nit} onChange={set('nit')} className="wsale-input" /></Field>
          <Field label="Origen">
            <select value={f.source} onChange={set('source')} className="wsale-input">
              <option value="">—</option>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Teléfono"><input value={f.phone} onChange={set('phone')} className="wsale-input" /></Field>
          <Field label="Correo"><input value={f.email} onChange={set('email')} className="wsale-input" /></Field>
        </div>
        <Field label="Notas">
          <textarea value={f.notes} onChange={set('notes')} rows={3} className="mt-1 w-full rounded-[2px] border border-[var(--rule)] bg-white p-3 text-[13px] outline-none focus:border-[var(--accent)]" />
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <button className="wsale-btn" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
        {saved && <span className="text-[12px] wsale-good">Guardado</span>}
      </div>

      {isCoordination && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--rule)]">
          {!o.client_id && (o.stage === 'ganado' || o.stage === 'negociacion' || o.stage === 'propuesta') && (
            <button className="wsale-btn-ghost" disabled={busy} onClick={() => run(async () => {
              const cid = await convertToClient(o.id); router.push(`/wholesale/clients/${cid}`);
            })}>Ganada: crear cliente</button>
          )}
          <button className="wsale-btn-ghost !text-[var(--alert)]" disabled={busy} onClick={() => {
            if (confirm('¿Eliminar esta oportunidad?')) run(async () => { await deleteOpportunity(o.id); router.push('/wholesale/oportunidades'); });
          }}>Eliminar</button>
        </div>
      )}
      {error && <p className="wsale-bad text-[12px]">{error}</p>}
    </div>
  );
}

export interface ContactData {
  id: string; name: string; role: string | null; influence: string; sentiment: string;
  phone: string | null; email: string | null; notes: string | null;
}

const SENT_COLOR: Record<string, string> = { a_favor: 'wsale-dot-good', neutral: '', en_contra: 'wsale-dot-bad' };

export function Contacts({ oppId, contacts, touches }: { oppId: string; contacts: ContactData[]; touches: Record<string, { n: number; last: string }> }) {
  const { busy, error, run } = useRun();
  const empty = { id: '', name: '', role: '', influence: 'influye', sentiment: 'neutral', phone: '', email: '', notes: '' };
  const [edit, setEdit] = useState<typeof empty | null>(null);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEdit((s) => s && { ...s, [k]: e.target.value });

  return (
    <section className="wsale-panel p-5">
      <div className="flex items-baseline justify-between mb-3">
        <p className="wsale-overline">Personas del centro</p>
        {!edit && <button className="text-[12px] text-[var(--accent)]" onClick={() => setEdit(empty)}>+ Agregar persona</button>}
      </div>

      {contacts.length === 0 && !edit && (
        <p className="text-[13px] text-[var(--ink-soft)]">Registra quién decide, quién influye y quién usa el producto.</p>
      )}

      <ul className="divide-y divide-[var(--rule)]">
        {contacts.map((c) => {
          const t = touches[c.id];
          return (
            <li key={c.id} className="py-2.5 flex items-start gap-3">
              <span className={`wsale-dot mt-1.5 ${SENT_COLOR[c.sentiment]}`} style={c.sentiment === 'neutral' ? { background: 'var(--ink-faint)' } : undefined} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px]">{c.name} <span className="text-[var(--ink-faint)]">· {c.role || 'Sin cargo'}</span></p>
                <p className="text-[11px] text-[var(--ink-faint)]">
                  {INFLUENCE_LABEL[c.influence]} · {SENTIMENT_LABEL[c.sentiment]}
                  {' · '}{t ? `${t.n} contacto${t.n === 1 ? '' : 's'}, último ${t.last}` : <span className={c.influence === 'decide' ? 'wsale-bad' : ''}>sin contacto registrado</span>}
                </p>
                {(c.phone || c.email) && <p className="text-[11px] text-[var(--ink-soft)]">{[c.phone, c.email].filter(Boolean).join(' · ')}</p>}
              </div>
              <button className="text-[11px] text-[var(--ink-soft)]" onClick={() => setEdit({
                id: c.id, name: c.name, role: c.role ?? '', influence: c.influence, sentiment: c.sentiment,
                phone: c.phone ?? '', email: c.email ?? '', notes: c.notes ?? '',
              })}>Editar</button>
            </li>
          );
        })}
      </ul>

      {edit && (
        <div className="mt-3 pt-3 border-t border-[var(--rule)] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input autoFocus placeholder="Nombre" value={edit.name} onChange={set('name')} className="wsale-input" />
            <input placeholder="Cargo" value={edit.role} onChange={set('role')} className="wsale-input" />
            <select value={edit.influence} onChange={set('influence')} className="wsale-input">
              {Object.entries(INFLUENCE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={edit.sentiment} onChange={set('sentiment')} className="wsale-input">
              {Object.entries(SENTIMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input placeholder="Teléfono" value={edit.phone} onChange={set('phone')} className="wsale-input" />
            <input placeholder="Correo" value={edit.email} onChange={set('email')} className="wsale-input" />
          </div>
          <div className="flex gap-2">
            <button className="wsale-btn" disabled={busy} onClick={() => run(() => saveContact({ ...edit, id: edit.id || undefined, opportunity_id: oppId })).then((ok) => ok && setEdit(null))}>Guardar</button>
            <button className="wsale-btn-ghost" onClick={() => setEdit(null)}>Cancelar</button>
            {edit.id && (
              <button className="wsale-btn-ghost !text-[var(--alert)] ml-auto" onClick={() => run(() => deleteContact(edit.id, oppId)).then((ok) => ok && setEdit(null))}>Quitar</button>
            )}
          </div>
        </div>
      )}
      {error && <p className="wsale-bad text-[12px] mt-2">{error}</p>}
    </section>
  );
}

export function InteractionForm({
  oppId, reps, contacts, myRep,
}: { oppId: string; reps: Opt[]; contacts: Opt[]; myRep: string | null }) {
  const { busy, error, run } = useRun();
  const init = {
    kind: 'llamada', happened_on: today(), summary: '', outcome: 'neutral',
    rep_ids: myRep ? [myRep] : [] as string[], contact_ids: [] as string[], next_action: '', next_action_on: '',
  };
  const [f, setF] = useState(init);
  const toggle = (k: 'rep_ids' | 'contact_ids', id: string) =>
    setF((s) => ({ ...s, [k]: s[k].includes(id) ? s[k].filter((x) => x !== id) : [...s[k], id] }));

  return (
    <section className="wsale-panel p-5 space-y-4">
      <p className="wsale-overline">Registrar interacción</p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(INTERACTION_LABEL).map(([k, v]) => (
          <button key={k} type="button" className="wsale-chip" data-on={f.kind === k} onClick={() => setF((s) => ({ ...s, kind: k }))}>{v}</button>
        ))}
      </div>
      <textarea
        value={f.summary} onChange={(e) => setF((s) => ({ ...s, summary: e.target.value }))} rows={3}
        placeholder="¿Qué se habló? ¿Qué objeción salió? ¿Qué se acordó?"
        className="w-full rounded-[2px] border border-[var(--rule)] bg-white p-3 text-[13px] outline-none focus:border-[var(--accent)]"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] text-[var(--ink-soft)] mb-1.5">De Aural</p>
          <div className="flex flex-wrap gap-1.5">
            {reps.map((r) => <button key={r.id} type="button" className="wsale-chip" data-on={f.rep_ids.includes(r.id)} onClick={() => toggle('rep_ids', r.id)}>{r.name}</button>)}
          </div>
        </div>
        <div>
          <p className="text-[11px] text-[var(--ink-soft)] mb-1.5">Del centro</p>
          <div className="flex flex-wrap gap-1.5">
            {contacts.length === 0 && <span className="text-[11px] text-[var(--ink-faint)]">Agrega personas en el panel de la derecha</span>}
            {contacts.map((c) => <button key={c.id} type="button" className="wsale-chip" data-on={f.contact_ids.includes(c.id)} onClick={() => toggle('contact_ids', c.id)}>{c.name}</button>)}
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[150px_150px_1fr_150px] items-end">
        <Field label="Fecha"><input type="date" value={f.happened_on} onChange={(e) => setF((s) => ({ ...s, happened_on: e.target.value }))} className="wsale-input" /></Field>
        <Field label="Resultado">
          <select value={f.outcome} onChange={(e) => setF((s) => ({ ...s, outcome: e.target.value }))} className="wsale-input">
            {Object.entries(OUTCOME_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Siguiente paso"><input value={f.next_action} onChange={(e) => setF((s) => ({ ...s, next_action: e.target.value }))} className="wsale-input" placeholder="Ej. Enviar propuesta" /></Field>
        <Field label="Para cuándo"><input type="date" value={f.next_action_on} onChange={(e) => setF((s) => ({ ...s, next_action_on: e.target.value }))} className="wsale-input" /></Field>
      </div>
      <div className="flex items-center gap-3">
        <button className="wsale-btn" disabled={busy} onClick={() => run(() => logInteraction({
          opportunity_id: oppId, ...f,
          next_action: f.next_action ? f.next_action : undefined,
          next_action_on: f.next_action_on || null,
        })).then((ok) => ok && setF(init))}>{busy ? 'Guardando…' : 'Guardar interacción'}</button>
        {error && <p className="wsale-bad text-[12px]">{error}</p>}
      </div>
    </section>
  );
}

export function DeleteInteraction({ id, oppId }: { id: string; oppId: string }) {
  const { busy, run } = useRun();
  return (
    <button disabled={busy} className="text-[10px] text-[var(--ink-faint)] hover:text-[var(--alert)]"
      onClick={() => confirm('¿Borrar esta interacción?') && run(() => deleteInteraction(id, oppId))}>Borrar</button>
  );
}
