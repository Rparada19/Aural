'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOpportunity } from '@/app/actions/crm';
import { KIND_LABEL, SOURCES } from '@/lib/crm';
import { Field } from '../Field';

type Opt = { id: string; name: string };

export function NewOpportunity({
  reps, clients, isCoordination, defaultRep, preset, label = 'Nueva oportunidad',
}: {
  reps: Opt[];
  clients: (Opt & { city?: string | null; zone?: string | null; rep_id?: string | null })[];
  isCoordination: boolean;
  defaultRep?: string | null;
  preset?: { kind: string; client_id: string };
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const presetClient = preset ? clients.find((c) => c.id === preset.client_id) : undefined;
  const [f, setF] = useState({
    name: presetClient?.name ?? '', kind: preset?.kind ?? 'cuenta_nueva', client_id: preset?.client_id ?? '',
    rep_id: presetClient?.rep_id ?? defaultRep ?? '', city: presetClient?.city ?? '', zone: presetClient?.zone ?? '',
    source: '', contact_name: '', contact_role: '', phone: '', email: '',
    est_units: '', est_amount: '', expected_close: '', next_action: '', next_action_on: '',
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  function pickClient(id: string) {
    const c = clients.find((x) => x.id === id);
    setF((s) => ({
      ...s, client_id: id, name: c?.name ?? s.name, city: c?.city ?? s.city, zone: c?.zone ?? s.zone,
      rep_id: c?.rep_id ?? s.rep_id,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const id = await createOpportunity({
        ...f,
        client_id: f.kind === 'cuenta_nueva' ? null : f.client_id || null,
        est_units: f.est_units ? Number(f.est_units) : null,
        est_amount: f.est_amount ? Number(f.est_amount) : null,
        expected_close: f.expected_close || null,
        next_action_on: f.next_action_on || null,
      });
      router.push(`/wholesale/oportunidades/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      setBusy(false);
    }
  }

  if (!open) {
    return <button className={preset ? 'wsale-btn-ghost' : 'wsale-btn'} onClick={() => setOpen(true)}>{label}</button>;
  }

  const existing = f.kind !== 'cuenta_nueva';

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center overflow-y-auto p-6" onClick={() => !busy && setOpen(false)}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="wsale-panel bg-[var(--paper-raised)] p-6 w-full max-w-2xl space-y-5 mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="wsale-display text-[20px]">Nueva oportunidad</h2>
          <button type="button" className="text-[12px] text-[var(--ink-soft)]" onClick={() => setOpen(false)}>Cerrar</button>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(KIND_LABEL).map(([k, v]) => (
            <button type="button" key={k} className="wsale-chip" data-on={f.kind === k} onClick={() => setF((s) => ({ ...s, kind: k }))}>{v}</button>
          ))}
        </div>

        {existing ? (
          <Field label="Cliente actual">
            <select required value={f.client_id} onChange={(e) => pickClient(e.target.value)} className="wsale-input">
              <option value="">Elige el centro</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        ) : (
          <Field label="Centro o prospecto">
            <input required value={f.name} onChange={set('name')} className="wsale-input" placeholder="Ej. Centro Auditivo del Norte" />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Ciudad"><input value={f.city} onChange={set('city')} className="wsale-input" /></Field>
          <Field label="Zona"><input value={f.zone} onChange={set('zone')} className="wsale-input" /></Field>
          <Field label="Origen">
            <select value={f.source} onChange={set('source')} className="wsale-input">
              <option value="">—</option>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        {!existing && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quién decide"><input value={f.contact_name} onChange={set('contact_name')} className="wsale-input" placeholder="Nombre" /></Field>
            <Field label="Cargo"><input value={f.contact_role} onChange={set('contact_role')} className="wsale-input" placeholder="Dueño, gerente, audióloga…" /></Field>
            <Field label="Teléfono"><input value={f.phone} onChange={set('phone')} className="wsale-input" /></Field>
            <Field label="Correo"><input type="email" value={f.email} onChange={set('email')} className="wsale-input" /></Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Unidades al año"><input type="number" min="0" value={f.est_units} onChange={set('est_units')} className="wsale-input" /></Field>
          <Field label="Valor estimado al año"><input type="number" min="0" value={f.est_amount} onChange={set('est_amount')} className="wsale-input" /></Field>
          <Field label="Cierre probable"><input type="date" value={f.expected_close} onChange={set('expected_close')} className="wsale-input" /></Field>
        </div>

        {isCoordination && (
          <Field label="Comercial responsable">
            <select value={f.rep_id} onChange={set('rep_id')} className="wsale-input">
              <option value="">Sin asignar</option>
              {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <Field label="Próxima acción"><input value={f.next_action} onChange={set('next_action')} className="wsale-input" placeholder="Ej. Llamar para agendar visita" /></Field>
          <Field label="Fecha"><input type="date" value={f.next_action_on} onChange={set('next_action_on')} className="wsale-input" /></Field>
        </div>

        {error && <p className="wsale-bad text-sm">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="wsale-btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
          <button className="wsale-btn" disabled={busy}>{busy ? 'Guardando…' : 'Crear oportunidad'}</button>
        </div>
      </form>
    </div>
  );
}
