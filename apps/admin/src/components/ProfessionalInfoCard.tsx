'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfessional } from '@/app/actions/professional';

interface Props {
  userId: string;
  initial: {
    full_name: string | null;
    cedula: string | null;
    phone: string | null;
    city: string | null;
    profession: string | null;
    address: string | null;
    email: string | null;
    specialty_label: string | null;
    status: string | null;
    created_at: string | null;
    approved_at: string | null;
    rejection_reason: string | null;
  };
}

export function ProfessionalInfoCard({ userId, initial }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    full_name: initial.full_name ?? '',
    cedula: initial.cedula ?? '',
    phone: initial.phone ?? '',
    city: initial.city ?? '',
    profession: initial.profession ?? '',
    address: initial.address ?? '',
  });

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateProfessional(userId, draft);
        setEditing(false);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al guardar.');
      }
    });
  }

  return (
    <section className="mt-8 bg-white border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-primary">Información del profesional</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre completo" value={draft.full_name} onChange={(v) => setDraft({ ...draft, full_name: v })} />
          <Field label="Cédula" value={draft.cedula} onChange={(v) => setDraft({ ...draft, cedula: v })} />
          <Field label="Teléfono" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} />
          <Field label="Ciudad" value={draft.city} onChange={(v) => setDraft({ ...draft, city: v })} />
          <Field label="Profesión" value={draft.profession} onChange={(v) => setDraft({ ...draft, profession: v })} />
          <Field label="Dirección" value={draft.address} onChange={(v) => setDraft({ ...draft, address: v })} />

          {error && <p className="md:col-span-2 text-danger text-sm bg-danger/10 px-3 py-2 rounded">{error}</p>}

          <div className="md:col-span-2 flex gap-2 pt-2">
            <button onClick={save} disabled={isPending} className="px-5 h-11 rounded-md bg-primary text-white font-semibold disabled:opacity-50">
              {isPending ? 'Guardando…' : 'Guardar'}
            </button>
            <button onClick={() => setEditing(false)} className="px-5 h-11 rounded-md border border-border text-secondary font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReadField label="Nombre completo" value={initial.full_name} />
          <ReadField label="Cédula" value={initial.cedula} />
          <ReadField label="Correo" value={initial.email} />
          <ReadField label="Teléfono" value={initial.phone} />
          <ReadField label="Ciudad" value={initial.city} />
          <ReadField label="Profesión" value={initial.profession} />
          <ReadField label="Especialidad" value={initial.specialty_label} />
          <ReadField label="Dirección" value={initial.address} />
          <ReadField label="Estado" value={initial.status} />
          <ReadField label="Registrado" value={initial.created_at ? new Date(initial.created_at).toLocaleString('es-CO') : null} />
          {initial.approved_at && (
            <ReadField label="Aprobado" value={new Date(initial.approved_at).toLocaleString('es-CO')} />
          )}
          {initial.rejection_reason && (
            <ReadField label="Motivo de rechazo" value={initial.rejection_reason} />
          )}
        </div>
      )}
    </section>
  );
}

function ReadField({ label, value }: { label: string; value: string | null | undefined }) {
  const isEmpty = !value;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-secondary">{label}</p>
      <div className="mt-1 min-h-[44px] rounded-md border border-border bg-surface px-3 py-2.5 flex items-center">
        <span className={`text-sm ${isEmpty ? 'text-secondary italic' : 'text-foreground'}`}>
          {value || 'No registrado'}
        </span>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
      />
    </label>
  );
}
