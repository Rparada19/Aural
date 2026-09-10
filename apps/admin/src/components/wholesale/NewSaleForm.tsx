'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createWholesaleSale } from '@/app/actions/wholesale';
import { Field, inputClass } from './Field';
import { cop } from '@/lib/format';

export function NewSaleForm({
  clients, styles, platforms, techLevels, campaigns, defaultClientId,
}: {
  clients: { id: string; name: string }[];
  styles: { slug: string; label: string; description: string | null }[];
  platforms: { slug: string; label: string }[];
  techLevels: { slug: string; label: string }[];
  campaigns: string[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_id: defaultClientId ?? '',
    sold_on: new Date().toISOString().slice(0, 10),
    invoice_number: '',
    campaign_name: '',
    patient_name: '',
    patient_document: '',
    units: '1',
    list_price: '',
    discount_percent: '0',
    binaural: 'unilateral',
    power: 'bateria',
    style: styles[0]?.slug ?? '',
    platform: '',
    tech_level: '',
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
        campaign_name: form.campaign_name,
        patient_name: form.patient_name,
        patient_document: form.patient_document,
        units: Number(form.units),
        binaural: form.binaural === 'binaural',
        rechargeable: form.power === 'recargable',
        style: form.style || null,
        platform: form.platform || null,
        tech_level: form.tech_level || null,
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
    <form onSubmit={onSubmit} className="wsale-panel p-6 max-w-2xl space-y-5">
      <Field label="Cliente">
        <select required value={form.client_id} onChange={set('client_id')} className="wsale-input">
          <option value="">Selecciona un cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Fecha de venta">
          <input required type="date" value={form.sold_on} onChange={set('sold_on')} className="wsale-input" />
        </Field>
        <Field label="Número de factura">
          <input value={form.invoice_number} onChange={set('invoice_number')} className="wsale-input" />
        </Field>
        <Field label="Campaña" hint="Si la venta salió de una campaña, escribe su nombre.">
          <input
            value={form.campaign_name}
            onChange={set('campaign_name')}
            list="campanas-wholesale"
            placeholder="Ej. Jornada octubre"
            className="wsale-input"
          />
          <datalist id="campanas-wholesale">
            {campaigns.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Paciente" hint="Del centro auditivo, para el recordatorio de garantía.">
          <input value={form.patient_name} onChange={set('patient_name')} className="wsale-input" />
        </Field>
        <Field label="Cédula">
          <input value={form.patient_document} onChange={set('patient_document')} className="wsale-input" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Unidades">
          <input required type="number" min="1" value={form.units} onChange={set('units')} className="wsale-input" />
        </Field>
        <Field label="Precio de lista" hint="Por unidad.">
          <input required type="number" min="0" step="1000" value={form.list_price} onChange={set('list_price')} className="wsale-input" />
        </Field>
        <Field label="Descuento %">
          <input type="number" min="0" max="100" step="0.5" value={form.discount_percent} onChange={set('discount_percent')} className="wsale-input" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Plataforma">
          <select required value={form.platform} onChange={set('platform')} className="wsale-input">
            <option value="">Selecciona…</option>
            {platforms.map((p) => <option key={p.slug} value={p.slug}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Tecnología">
          <select required value={form.tech_level} onChange={set('tech_level')} className="wsale-input">
            <option value="">Selecciona…</option>
            {techLevels.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Choice
          label="Adaptación"
          value={form.binaural}
          onChange={(v) => setForm((f) => ({ ...f, binaural: v }))}
          options={[
            { value: 'unilateral', label: 'Unilateral' },
            { value: 'binaural', label: 'Binaural' },
          ]}
        />
        <Choice
          label="Alimentación"
          value={form.power}
          onChange={(v) => setForm((f) => ({ ...f, power: v }))}
          options={[
            { value: 'bateria', label: 'Batería' },
            { value: 'recargable', label: 'Recargable' },
          ]}
        />
        <Choice
          label="Formato"
          value={form.style}
          onChange={(v) => setForm((f) => ({ ...f, style: v }))}
          options={styles.map((s) => ({ value: s.slug, label: s.label, hint: s.description }))}
        />
      </div>

      <div className="bg-[var(--paper)] rounded-[3px] px-5 py-4 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">Neto</span>
        <span className="text-xl font-semibold">{cop(net)}</span>
      </div>

      {error && <p className="wsale-bad text-sm bg-danger/10 px-3 py-2 rounded-[2px]">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="wsale-btn"
      >
        {loading ? 'Guardando…' : 'Registrar venta'}
      </button>
    </form>
  );
}


function Choice({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; hint?: string | null }[];
}) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">{label}</span>
      <div className="mt-1 flex rounded-[2px] border border-[var(--rule)] overflow-hidden">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            title={o.hint ?? undefined}
            onClick={() => onChange(o.value)}
            className={`flex-1 h-11 text-sm font-medium transition ${
              value === o.value ? 'bg-[var(--ink)] text-white' : 'bg-white hover:bg-[rgba(16,35,63,.05)]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
