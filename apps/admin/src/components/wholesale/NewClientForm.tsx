'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWholesaleClient } from '@/app/actions/wholesale';
import { Field, inputClass } from './Field';

export function NewClientForm({ reps }: { reps: { id: string; name: string; zone: string | null }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', nit: '', contact_name: '', phone: '', email: '',
    city: '', zone: '', rep_id: '', notes: '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createWholesaleClient({ ...form, rep_id: form.rep_id || null });
      router.push('/wholesale/clients');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-border p-6 shadow-sm max-w-2xl space-y-5">
      <Field label="Nombre del centro">
        <input required value={form.name} onChange={set('name')} className={inputClass} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="NIT">
          <input value={form.nit} onChange={set('nit')} className={inputClass} />
        </Field>
        <Field label="Contacto">
          <input value={form.contact_name} onChange={set('contact_name')} className={inputClass} />
        </Field>
        <Field label="Teléfono">
          <input value={form.phone} onChange={set('phone')} className={inputClass} />
        </Field>
        <Field label="Correo" hint="Aquí llegarán los recordatorios de garantía.">
          <input type="email" value={form.email} onChange={set('email')} className={inputClass} />
        </Field>
        <Field label="Ciudad">
          <input value={form.city} onChange={set('city')} className={inputClass} />
        </Field>
        <Field label="Zona">
          <input value={form.zone} onChange={set('zone')} className={inputClass} />
        </Field>
      </div>

      <Field label="Comercial asignado">
        <select value={form.rep_id} onChange={set('rep_id')} className={inputClass}>
          <option value="">Sin asignar</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>{r.name}{r.zone ? ` · ${r.zone}` : ''}</option>
          ))}
        </select>
      </Field>

      <Field label="Notas">
        <textarea
          value={form.notes}
          onChange={set('notes')}
          rows={3}
          className="mt-1 w-full rounded-lg border border-border bg-white p-3 outline-none focus:border-primary"
        />
      </Field>

      {error && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="h-12 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-50 transition"
      >
        {loading ? 'Guardando…' : 'Guardar cliente'}
      </button>
    </form>
  );
}
