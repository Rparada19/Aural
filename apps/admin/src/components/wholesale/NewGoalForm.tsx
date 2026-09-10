'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWholesaleGoal, createWholesaleProject } from '@/app/actions/wholesale';
import { Field, inputClass } from './Field';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function NewGoalForm({
  repId, year, month,
}: {
  repId: string;
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', target_value: '', month: String(month) });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createWholesaleGoal({
        rep_id: repId,
        year,
        month: Number(form.month),
        title: form.title,
        description: form.description,
        target_value: form.target_value ? Number(form.target_value) : null,
      });
      setForm({ title: '', description: '', target_value: '', month: String(month) });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full h-11 rounded-[2px] border border-dashed border-[var(--rule)] text-[var(--ink-soft)] text-sm hover:border-[var(--rule-strong)] hover:text-[var(--accent)] transition"
      >
        + Nuevo objetivo
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-[var(--rule)] rounded-[3px] p-4 space-y-3">
      <Field label="Objetivo">
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="wsale-input" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mes">
          <select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className="wsale-input">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </Field>
        <Field label="Meta numérica" hint="Opcional.">
          <input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} className="wsale-input" />
        </Field>
      </div>
      <Field label="Detalle">
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-[2px] border border-[var(--rule)] p-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </Field>
      {error && <p className="wsale-bad text-xs">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="wsale-btn">
          {saving ? 'Guardando…' : 'Crear objetivo'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="wsale-btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function NewProjectForm({
  repId, clients,
}: {
  repId: string;
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', kind: 'evento', client_id: '', starts_on: '', ends_on: '', budget_amount: '', description: '',
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createWholesaleProject({
        rep_id: repId,
        client_id: form.client_id || null,
        title: form.title,
        kind: form.kind as 'evento' | 'campana' | 'capacitacion' | 'otro',
        description: form.description,
        starts_on: form.starts_on || null,
        ends_on: form.ends_on || null,
        budget_amount: form.budget_amount ? Number(form.budget_amount) : null,
      });
      setForm({ title: '', kind: 'evento', client_id: '', starts_on: '', ends_on: '', budget_amount: '', description: '' });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full h-11 rounded-[2px] border border-dashed border-[var(--rule)] text-[var(--ink-soft)] text-sm hover:border-[var(--rule-strong)] hover:text-[var(--accent)] transition"
      >
        + Nuevo proyecto
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-[var(--rule)] rounded-[3px] p-4 space-y-3">
      <Field label="Proyecto">
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="wsale-input" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="wsale-input">
            <option value="evento">Evento</option>
            <option value="campana">Campaña</option>
            <option value="capacitacion">Capacitación</option>
            <option value="otro">Otro</option>
          </select>
        </Field>
        <Field label="Cliente" hint="Opcional.">
          <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="wsale-input">
            <option value="">Sin cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Inicia">
          <input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} className="wsale-input" />
        </Field>
        <Field label="Termina">
          <input type="date" value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} className="wsale-input" />
        </Field>
      </div>
      <Field label="Inversión estimada" hint="Opcional.">
        <input type="number" step="1000" value={form.budget_amount} onChange={(e) => setForm({ ...form, budget_amount: e.target.value })} className="wsale-input" />
      </Field>
      <Field label="Detalle">
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="mt-1 w-full rounded-[2px] border border-[var(--rule)] p-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </Field>
      {error && <p className="wsale-bad text-xs">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="wsale-btn">
          {saving ? 'Guardando…' : 'Crear proyecto'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="wsale-btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}
