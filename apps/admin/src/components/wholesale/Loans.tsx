'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createLoan, returnLoan, sellLoan, deleteLoan } from '@/app/actions/wholesale';
import { Field, inputClass } from './Field';
import { cop } from '@/lib/format';

export const LOAN_DAYS = 14;

export interface Loan {
  id: string;
  client_id: string;
  rep_id: string | null;
  loaned_on: string;
  due_on: string;
  returned_on: string | null;
  platform: string | null;
  tech_level: string | null;
  style: string | null;
  units: number;
  binaural: boolean;
  rechargeable: boolean;
  serials: string[];
  patient_name: string | null;
  notes: string | null;
  status: 'active' | 'returned' | 'sold' | 'lost';
}

export interface Catalogs {
  platforms: { slug: string; label: string }[];
  techLevels: { slug: string; label: string }[];
  styles: { slug: string; label: string }[];
}

/** Días que faltan (positivo) o que lleva vencido (negativo). */
export function daysLeft(dueOn: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round(
    (Date.parse(`${dueOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
}

export function LoanLight({ dueOn }: { dueOn: string }) {
  const d = daysLeft(dueOn);
  const [tone, label] =
    d < 0 ? ['bg-danger text-white', `Vencido hace ${Math.abs(d)} día${Math.abs(d) === 1 ? '' : 's'}`]
    : d === 0 ? ['bg-danger text-white', 'Vence hoy']
    : d <= 3 ? ['bg-warning text-white', `Faltan ${d} día${d === 1 ? '' : 's'}`]
    : ['bg-success text-white', `Faltan ${d} días`];
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-md whitespace-nowrap ${tone}`}>
      {label}
    </span>
  );
}

export function Loans({
  loans, clients, catalogs, canCreate, showClient = false,
}: {
  loans: Loan[];
  clients: { id: string; name: string }[];
  catalogs: Catalogs;
  canCreate: boolean;
  showClient?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selling, setSelling] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const label = (list: { slug: string; label: string }[], slug: string | null) =>
    slug ? list.find((x) => x.slug === slug)?.label ?? slug : null;

  const active = loans
    .filter((l) => l.status === 'active')
    .sort((a, b) => a.due_on.localeCompare(b.due_on));
  const closed = loans.filter((l) => l.status !== 'active');

  async function run(id: string, fn: () => Promise<void>) {
    setBusy(id);
    try { await fn(); router.refresh(); } finally { setBusy(null); }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div>
          <h2 className="font-semibold">Préstamos de prueba</h2>
          <p className="text-secondary text-xs mt-1">
            {active.length} equipo{active.length === 1 ? '' : 's'} en la calle · plazo de {LOAN_DAYS} días
          </p>
        </div>
        {active.filter((l) => daysLeft(l.due_on) < 0).length > 0 && (
          <span className="text-danger text-sm font-semibold">
            {active.filter((l) => daysLeft(l.due_on) < 0).length} vencidos
          </span>
        )}
      </div>

      <div className="space-y-3">
        {active.length === 0 && (
          <p className="text-secondary text-sm">No hay equipos prestados.</p>
        )}

        {active.map((l) => (
          <div key={l.id} className="border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {showClient && (
                  <Link href={`/wholesale/clients/${l.client_id}`} className="font-medium hover:underline">
                    {clientName.get(l.client_id) ?? 'Cliente'}
                  </Link>
                )}
                <p className="text-sm">
                  {[
                    label(catalogs.platforms, l.platform),
                    l.tech_level,
                    label(catalogs.styles, l.style),
                  ].filter(Boolean).join(' ') || 'Equipo de prueba'}
                </p>
                <p className="text-secondary text-xs mt-0.5">
                  {l.units} und · {l.binaural ? 'binaural' : 'unilateral'} ·{' '}
                  {l.rechargeable ? 'recargable' : 'batería'}
                  {l.patient_name && ` · ${l.patient_name}`}
                </p>
              </div>
              <LoanLight dueOn={l.due_on} />
            </div>

            <div className="flex flex-wrap gap-1 mt-3">
              {l.serials.map((s) => (
                <span key={s} className="text-xs font-mono bg-surface rounded px-2 py-1">{s}</span>
              ))}
            </div>

            <p className="text-secondary text-xs mt-2">
              Prestado {l.loaned_on} · devolver {l.due_on}
            </p>
            {l.notes && <p className="text-secondary text-xs mt-1 italic">{l.notes}</p>}

            {selling === l.id ? (
              <SellForm
                loanId={l.id}
                onDone={() => { setSelling(null); router.refresh(); }}
                onCancel={() => setSelling(null)}
              />
            ) : (
              <div className="flex gap-3 mt-3 text-sm">
                <button
                  onClick={() => setSelling(l.id)}
                  className="text-primary font-semibold hover:underline"
                >
                  El cliente lo vendió
                </button>
                <button
                  onClick={() => run(l.id, () => returnLoan(l.id))}
                  disabled={busy === l.id}
                  className="text-secondary hover:text-foreground disabled:opacity-50"
                >
                  Devuelto
                </button>
                <button
                  onClick={() => run(l.id, () => deleteLoan(l.id))}
                  disabled={busy === l.id}
                  className="text-secondary hover:text-danger disabled:opacity-50 ml-auto"
                >
                  Borrar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {canCreate && (
        <div className="mt-4">
          {open ? (
            <NewLoan
              clients={clients}
              catalogs={catalogs}
              onDone={() => { setOpen(false); router.refresh(); }}
              onCancel={() => setOpen(false)}
            />
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="w-full h-11 rounded-lg border border-dashed border-border text-secondary text-sm hover:border-primary hover:text-primary transition"
            >
              + Registrar préstamo
            </button>
          )}
        </div>
      )}

      {closed.length > 0 && (
        <details className="mt-5">
          <summary className="text-secondary text-sm cursor-pointer hover:text-foreground">
            Cerrados ({closed.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {closed.map((l) => (
              <li key={l.id} className="flex items-center gap-3 text-sm border-b border-border pb-2">
                <span className="flex-1 truncate">
                  {showClient && `${clientName.get(l.client_id) ?? ''} · `}
                  {l.serials.join(', ')}
                </span>
                <span className={`text-xs ${l.status === 'sold' ? 'text-success font-semibold' : 'text-secondary'}`}>
                  {l.status === 'sold' ? 'Vendido' : l.status === 'returned' ? 'Devuelto' : 'Perdido'}
                  {l.returned_on && ` · ${l.returned_on}`}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function SellForm({
  loanId, onDone, onCancel,
}: {
  loanId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    sold_on: new Date().toISOString().slice(0, 10),
    invoice_number: '',
    campaign_name: '',
    list_price: '',
    discount_percent: '0',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const net = (Number(form.list_price) || 0) * (1 - (Number(form.discount_percent) || 0) / 100);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await sellLoan(loanId, {
        sold_on: form.sold_on,
        invoice_number: form.invoice_number,
        campaign_name: form.campaign_name,
        list_price: Number(form.list_price),
        discount_percent: Number(form.discount_percent),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 pt-3 border-t border-border space-y-3">
      <p className="text-xs text-secondary">
        Se crea la venta con los datos del préstamo. Solo falta el precio.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha de venta">
          <input type="date" required value={form.sold_on}
            onChange={(e) => setForm({ ...form, sold_on: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Factura">
          <input value={form.invoice_number}
            onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Precio de lista" hint="Por unidad.">
          <input type="number" required min="0" step="1000" value={form.list_price}
            onChange={(e) => setForm({ ...form, list_price: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Descuento %">
          <input type="number" min="0" max="100" step="0.5" value={form.discount_percent}
            onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} className={inputClass} />
        </Field>
      </div>
      <Field label="Campaña" hint="Opcional.">
        <input value={form.campaign_name}
          onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} className={inputClass} />
      </Field>
      {net > 0 && (
        <p className="text-sm">
          Neto por unidad: <span className="font-semibold">{cop(net)}</span>
        </p>
      )}
      {error && <p className="text-danger text-xs">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-soft disabled:opacity-50 transition">
          {saving ? 'Registrando…' : 'Registrar venta'}
        </button>
        <button type="button" onClick={onCancel}
          className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-surface transition">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function NewLoan({
  clients, catalogs, onDone, onCancel,
}: {
  clients: { id: string; name: string }[];
  catalogs: Catalogs;
  onDone: () => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    client_id: clients[0]?.id ?? '',
    loaned_on: today,
    platform: '',
    tech_level: '',
    style: catalogs.styles[0]?.slug ?? '',
    units: '1',
    binaural: 'unilateral',
    power: 'bateria',
    serials: '',
    patient_name: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const due = new Date(Date.parse(`${form.loaned_on}T00:00:00Z`) + LOAN_DAYS * 86_400_000)
    .toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createLoan({
        client_id: form.client_id,
        loaned_on: form.loaned_on,
        platform: form.platform || null,
        tech_level: form.tech_level || null,
        style: form.style || null,
        units: Number(form.units),
        binaural: form.binaural === 'binaural',
        rechargeable: form.power === 'recargable',
        serials: form.serials.split(/[\n,]+/),
        patient_name: form.patient_name,
        notes: form.notes,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="border border-border rounded-xl p-4 space-y-3">
      <Field label="Cliente">
        <select required value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: e.target.value })} className={inputClass}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha del préstamo">
          <input type="date" required value={form.loaned_on}
            onChange={(e) => setForm({ ...form, loaned_on: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Devolver antes de" hint={`${LOAN_DAYS} días de plazo.`}>
          <input value={due} readOnly className={`${inputClass} bg-surface text-secondary`} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Plataforma">
          <select value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })} className={inputClass}>
            <option value="">—</option>
            {catalogs.platforms.map((p) => <option key={p.slug} value={p.slug}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Tecnología">
          <select value={form.tech_level}
            onChange={(e) => setForm({ ...form, tech_level: e.target.value })} className={inputClass}>
            <option value="">—</option>
            {catalogs.techLevels.map((t) => <option key={t.slug} value={t.slug}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Formato">
          <select value={form.style}
            onChange={(e) => setForm({ ...form, style: e.target.value })} className={inputClass}>
            {catalogs.styles.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Unidades">
          <input type="number" min="1" required value={form.units}
            onChange={(e) => setForm({ ...form, units: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Adaptación">
          <select value={form.binaural}
            onChange={(e) => setForm({ ...form, binaural: e.target.value })} className={inputClass}>
            <option value="unilateral">Unilateral</option>
            <option value="binaural">Binaural</option>
          </select>
        </Field>
        <Field label="Alimentación">
          <select value={form.power}
            onChange={(e) => setForm({ ...form, power: e.target.value })} className={inputClass}>
            <option value="bateria">Batería</option>
            <option value="recargable">Recargable</option>
          </select>
        </Field>
      </div>

      <Field label="Seriales" hint="Uno por línea, o separados por coma. Es lo que hay que recuperar.">
        <textarea
          required
          rows={2}
          value={form.serials}
          onChange={(e) => setForm({ ...form, serials: e.target.value })}
          placeholder="AB123456&#10;AB123457"
          className="mt-1 w-full rounded-lg border border-border p-2 text-sm font-mono outline-none focus:border-primary"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Paciente" hint="Opcional.">
          <input value={form.patient_name}
            onChange={(e) => setForm({ ...form, patient_name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Nota">
          <input value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
        </Field>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-soft disabled:opacity-50 transition">
          {saving ? 'Guardando…' : 'Registrar préstamo'}
        </button>
        <button type="button" onClick={onCancel}
          className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-surface transition">
          Cancelar
        </button>
      </div>
    </form>
  );
}
