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
    <form onSubmit={onSubmit} className="wsale-panel p-6 max-w-2xl space-y-5">
      <Field label="Nombre del centro">
        <input required value={form.name} onChange={set('name')} className="wsale-input" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="NIT">
          <input value={form.nit} onChange={set('nit')} className="wsale-input" />
        </Field>
        <Field label="Contacto">
          <input value={form.contact_name} onChange={set('contact_name')} className="wsale-input" />
        </Field>
        <Field label="Teléfono">
          <input value={form.phone} onChange={set('phone')} className="wsale-input" />
        </Field>
        <Field label="Correo" hint="Aquí llegarán los recordatorios de garantía.">
          <input type="email" value={form.email} onChange={set('email')} className="wsale-input" />
        </Field>
        <Field label="Ciudad">
          <input value={form.city} onChange={set('city')} className="wsale-input" />
        </Field>
        <Field label="Zona">
          <input value={form.zone} onChange={set('zone')} className="wsale-input" />
        </Field>
      </div>

      <Field label="Comercial asignado">
        <select value={form.rep_id} onChange={set('rep_id')} className="wsale-input">
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
          className="mt-1 w-full rounded-[2px] border border-[var(--rule)] bg-white p-3 outline-none focus:border-[var(--accent)]"
        />
      </Field>

      {error && <p className="wsale-bad text-sm bg-danger/10 px-3 py-2 rounded-[2px]">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="wsale-btn"
      >
        {loading ? 'Guardando…' : 'Guardar cliente'}
      </button>
    </form>
  );
}
