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
    <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-4">
      <h2 className="font-semibold">Nuevo comercial</h2>
      <Field label="Nombre">
        <input required value={form.name} onChange={set('name')} className={inputClass} />
      </Field>
      <Field label="Zona" hint="Ej. Costa, Antioquia, Bogotá.">
        <input value={form.zone} onChange={set('zone')} className={inputClass} />
      </Field>
      <Field label="Teléfono">
        <input value={form.phone} onChange={set('phone')} className={inputClass} />
      </Field>
      <Field label="Correo">
        <input type="email" value={form.email} onChange={set('email')} className={inputClass} />
      </Field>

      {error && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-50 transition"
      >
        {loading ? 'Guardando…' : 'Crear comercial'}
      </button>
      <p className="text-xs text-secondary">
        Esto crea la ficha del comercial. Para darle acceso a la app, luego se vincula desde Equipo Aural.
      </p>
    </form>
  );
}
