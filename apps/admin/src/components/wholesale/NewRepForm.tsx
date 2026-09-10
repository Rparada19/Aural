'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWholesaleRep } from '@/app/actions/wholesale';
import { Field, inputClass } from './Field';

export function NewRepForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', zone: '', phone: '', email: '' });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createWholesaleRep(form);
      setForm({ name: '', zone: '', phone: '', email: '' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="wsale-panel p-6 space-y-4">
      <h2 className="font-semibold">Nuevo comercial</h2>
      <Field label="Nombre">
        <input required value={form.name} onChange={set('name')} className="wsale-input" />
      </Field>
      <Field label="Zona" hint="Ej. Costa, Antioquia, Bogotá.">
        <input value={form.zone} onChange={set('zone')} className="wsale-input" />
      </Field>
      <Field label="Teléfono">
        <input value={form.phone} onChange={set('phone')} className="wsale-input" />
      </Field>
      <Field label="Correo">
        <input type="email" value={form.email} onChange={set('email')} className="wsale-input" />
      </Field>

      {error && <p className="wsale-bad text-sm bg-danger/10 px-3 py-2 rounded-[2px]">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-[2px] bg-[var(--ink)] text-white font-semibold hover:opacity-90 disabled:opacity-50 transition"
      >
        {loading ? 'Guardando…' : 'Crear comercial'}
      </button>
      <p className="text-xs text-[var(--ink-soft)]">
        Esto crea la ficha del comercial. Para darle acceso a la app, luego se vincula desde Equipo Aural.
      </p>
    </form>
  );
}
