'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePatient } from '@/app/actions/patients';
import { CASE_TYPE_LABEL } from '@aural/shared';

interface Opt { id: string; label: string }
interface Audio { id: string; name: string; locationId: string | null }

interface Props {
  patientId: string;
  professionalId: string;
  initial: {
    email: string | null;
    notes: string | null;
    appointment_at: string | null;
    appointment_status: string;
    visitor_id: string | null;
    location_id: string | null;
    audiologist_id: string | null;
    case_type: string;
    hearing_loss_side: string | null;
  };
  visitors: Opt[];
  locations: Opt[];
  audiologists: Audio[];
}

const showSide = (ct: string) => ct === 'sale_candidate' || ct === 'sudden_hearing_loss';
const SIDE_LABEL: Record<string, string> = { unilateral: 'Unilateral', bilateral: 'Bilateral' };

const APPT_STATUS = [
  { v: 'pending', l: 'Pendiente' },
  { v: 'confirmed', l: 'Confirmada' },
  { v: 'attended', l: 'Atendida' },
  { v: 'cancelled', l: 'Cancelada' },
];

export function GeneralInfoEditor({ patientId, professionalId, initial, visitors, locations, audiologists }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [d, setD] = useState({
    email: initial.email ?? '',
    notes: initial.notes ?? '',
    appointment_at: initial.appointment_at ? initial.appointment_at.slice(0, 16) : '',
    appointment_status: initial.appointment_status,
    visitor_id: initial.visitor_id ?? '',
    location_id: initial.location_id ?? '',
    audiologist_id: initial.audiologist_id ?? '',
    case_type: initial.case_type,
    hearing_loss_side: initial.hearing_loss_side ?? '',
  });
  const [error, setError] = useState<string | null>(null);

  const filteredAudios = useMemo(() => {
    if (!d.location_id) return audiologists;
    return audiologists.filter((a) => a.locationId === d.location_id || a.locationId === null);
  }, [d.location_id, audiologists]);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {
          email: d.email || null,
          notes: d.notes || null,
          appointment_at: d.appointment_at ? new Date(d.appointment_at).toISOString() : null,
          appointment_status: d.appointment_status,
          visitor_id: d.visitor_id || null,
          location_id: d.location_id || null,
          audiologist_id: d.audiologist_id || null,
          case_type: d.case_type,
          hearing_loss_side: showSide(d.case_type) ? (d.hearing_loss_side || null) : null,
        };
        await updatePatient(patientId, professionalId, payload);
        setEditing(false);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al guardar.');
      }
    });
  }

  if (!editing) {
    const visitorName = visitors.find((v) => v.id === initial.visitor_id)?.label ?? '—';
    const locName = locations.find((l) => l.id === initial.location_id)?.label ?? '—';
    const audioName = audiologists.find((a) => a.id === initial.audiologist_id)?.name ?? '—';
    return (
      <div>
        <Row label="Correo" value={initial.email ?? '—'} />
        <Row label="Observaciones" value={initial.notes ?? '—'} />
        <Row
          label="Cita"
          value={initial.appointment_at ? `${new Date(initial.appointment_at).toLocaleString('es-CO')} · ${APPT_STATUS.find(s => s.v === initial.appointment_status)?.l ?? initial.appointment_status}` : '—'}
        />
        <Row label="Visitador médico" value={visitorName} />
        <Row label="Centro auditivo" value={locName} />
        <Row label="Audiólogo" value={audioName} />
        <Row label="Tipo de caso" value={CASE_TYPE_LABEL[initial.case_type as keyof typeof CASE_TYPE_LABEL] ?? initial.case_type} />
        {showSide(initial.case_type) && (
          <Row label="Lateralidad" value={SIDE_LABEL[initial.hearing_loss_side ?? ''] ?? '—'} />
        )}
        <button onClick={() => setEditing(true)} className="mt-3 text-xs font-semibold text-primary hover:underline">
          Editar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Field label="Correo">
        <input type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Observaciones">
        <textarea rows={2} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} className={inputCls} />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Fecha y hora de la cita">
          <input type="datetime-local" value={d.appointment_at} onChange={(e) => setD({ ...d, appointment_at: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Estado de la cita">
          <select value={d.appointment_status} onChange={(e) => setD({ ...d, appointment_status: e.target.value })} className={inputCls}>
            {APPT_STATUS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Visitador médico">
        <select value={d.visitor_id} onChange={(e) => setD({ ...d, visitor_id: e.target.value })} className={inputCls}>
          <option value="">—</option>
          {visitors.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
      </Field>
      <Field label="Centro auditivo">
        <select value={d.location_id} onChange={(e) => setD({ ...d, location_id: e.target.value, audiologist_id: '' })} className={inputCls}>
          <option value="">—</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
      </Field>
      <Field label="Audiólogo">
        <select value={d.audiologist_id} onChange={(e) => setD({ ...d, audiologist_id: e.target.value })} className={inputCls}>
          <option value="">—</option>
          {filteredAudios.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Tipo de caso">
        <select value={d.case_type} onChange={(e) => setD({ ...d, case_type: e.target.value })} className={inputCls}>
          {Object.entries(CASE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      {showSide(d.case_type) && (
        <Field label="Lateralidad">
          <select value={d.hearing_loss_side} onChange={(e) => setD({ ...d, hearing_loss_side: e.target.value })} className={inputCls}>
            <option value="">—</option>
            <option value="unilateral">Unilateral</option>
            <option value="bilateral">Bilateral</option>
          </select>
        </Field>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button onClick={save} disabled={isPending} className="px-4 h-10 rounded-md bg-primary text-white text-sm font-semibold disabled:opacity-50">
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={() => setEditing(false)} className="px-4 h-10 rounded-md border border-border text-secondary text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}

const inputCls = 'mt-1 w-full h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">{label}</span>
      {children}
    </label>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-1.5 gap-4 text-sm">
      <span className="text-xs uppercase tracking-wider text-secondary font-semibold flex-shrink-0">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}
