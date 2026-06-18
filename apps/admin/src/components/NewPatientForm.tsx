'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPatient } from '@/app/actions/patients';

interface City { id: string; name: string }

export function NewPatientForm({ professionalId, cities }: { professionalId: string; cities: City[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      full_name: String(formData.get('full_name') ?? ''),
      cedula: String(formData.get('cedula') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      email: String(formData.get('email') ?? '') || null,
      city_id: String(formData.get('city_id') ?? '') || null,
      notes: String(formData.get('notes') ?? '') || null,
    };
    if (!payload.full_name || !payload.cedula || !payload.phone) {
      setError('Nombre, cédula y teléfono son obligatorios.');
      return;
    }
    startTransition(async () => {
      try {
        const p = await createPatient(professionalId, payload);
        router.push(`/users/${professionalId}/patients/${p.id}`);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'No se pudo crear el paciente.');
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <Field name="full_name" label="Nombre completo" required />
      <Field name="cedula" label="Cédula" required />
      <Field name="phone" label="Teléfono" required />
      <Field name="email" label="Correo (opcional)" type="email" />

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Ciudad</span>
        <select name="city_id" className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary">
          <option value="">—</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Observaciones</span>
        <textarea name="notes" rows={3} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary" />
      </label>

      {error && <p className="text-danger text-sm">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="px-5 h-11 rounded-md bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-50">
          {isPending ? 'Creando…' : 'Crear paciente'}
        </button>
      </div>
    </form>
  );
}

function Field({ name, label, required, type = 'text' }: { name: string; label: string; required?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">{label}{required ? ' *' : ''}</span>
      <input name={name} type={type} required={required} className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary" />
    </label>
  );
}
