'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createWholesaleSale } from '@/app/actions/wholesale';
import { Field, inputClass } from './Field';
import { cop } from '@/lib/format';

export function NewSaleForm({
  clients, defaultClientId,
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_id: defaultClientId ?? '',
    sold_on: new Date().toISOString().slice(0, 10),
    invoice_number: '',
    patient_name: '',
    patient_document: '',
    units: '1',
    list_price: '',
    discount_percent: '0',
    binaural: false,
    rechargeable: false,
  });

  const net = useMemo(() => {
    const price = Number(form.list_price) || 0;
    const units = Number(form.units) || 0;
    const disc = Number(form.discount_percent) || 0;
    return price * units * (1 - disc / 100);
  }, [form.list_price, form.units, form.discount_percent]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value,
    }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createWholesaleSale({
        client_id: form.client_id,
        sold_on: form.sold_on,
        invoice_number: form.invoice_number,
        patient_name: form.patient_name,
        patient_document: form.patient_document,
        units: Number(form.units),
        binaural: form.binaural,
        rechargeable: form.rechargeable,
        list_price: Number(form.list_price),
        discount_percent: Number(form.discount_percent),
      });
      router.push(`/wholesale/clients/${form.client_id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-border p-6 shadow-sm max-w-2xl space-y-5">
      <Field label="Cliente">
        <select required value={form.client_id} onChange={set('client_id')} className={inputClass}>
          <option value="">Selecciona un cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Fecha de venta">
          <input required type="date" value={form.sold_on} onChange={set('sold_on')} className={inputClass} />
        </Field>
        <Field label="Número de factura">
          <input value={form.invoice_number} onChange={set('invoice_number')} className={inputClass} />
        </Field>
        <Field label="Paciente" hint="Del centro auditivo, para el recordatorio de garantía.">
          <input value={form.patient_name} onChange={set('patient_name')} className={inputClass} />
        </Field>
        <Field label="Cédula">
          <input value={form.patient_document} onChange={set('patient_document')} className={inputClass} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Unidades">
          <input required type="number" min="1" value={form.units} onChange={set('units')} className={inputClass} />
        </Field>
        <Field label="Precio de lista" hint="Por unidad.">
          <input required type="number" min="0" step="1000" value={form.list_price} onChange={set('list_price')} className={inputClass} />
        </Field>
        <Field label="Descuento %">
          <input type="number" min="0" max="100" step="0.5" value={form.discount_percent} onChange={set('discount_percent')} className={inputClass} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.binaural} onChange={set('binaural')} className="w-4 h-4 accent-[var(--primary)]" />
          Adaptación binaural
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.rechargeable} onChange={set('rechargeable')} className="w-4 h-4 accent-[var(--primary)]" />
          Recargable
        </label>
      </div>

      <div className="bg-surface rounded-xl px-5 py-4 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Neto</span>
        <span className="text-xl font-semibold">{cop(net)}</span>
      </div>

      {error && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="h-12 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-50 transition"
      >
        {loading ? 'Guardando…' : 'Registrar venta'}
      </button>
    </form>
  );
}
