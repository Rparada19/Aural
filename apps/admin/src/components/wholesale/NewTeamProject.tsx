'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTeamProject } from '@/app/actions/wholesale';

export function NewTeamProject({
  reps, clients,
}: {
  reps: { id: string; name: string; zone: string | null }[];
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: '', kind: 'evento', client_id: '',
    starts_on: '', ends_on: '', budget_amount: '', description: '',
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const id = await createTeamProject({
        title: form.title,
        kind: form.kind as 'evento' | 'campana' | 'capacitacion' | 'otro',
        rep_ids: team,
        client_id: form.client_id || null,
        description: form.description,
        starts_on: form.starts_on || null,
        ends_on: form.ends_on || null,
        budget_amount: form.budget_amount ? Number(form.budget_amount) : null,
      });
      router.push(`/wholesale/proyectos/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear');
      setSaving(false);
    }
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="wsale-btn">Nuevo proyecto</button>;
  }

  return (
    <form onSubmit={submit} className="wsale-panel p-6 space-y-5 mb-6">
      <label className="block">
        <span className="wsale-overline">Proyecto</span>
        <input
          required autoFocus value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Ej. Jornada auditiva en Cartagena"
          className="wsale-input mt-1.5"
        />
      </label>

      <div>
        <span className="wsale-overline">Comerciales involucrados</span>
        <p className="text-[11px] text-[var(--ink-faint)] mt-1 mb-2">
          El primero que marques queda como responsable. Todos ven el proyecto y escriben en su hilo.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {reps.map((r) => {
            const on = team.includes(r.id);
            const lead = team[0] === r.id;
            return (
              <label
                key={r.id}
                className={`flex items-center gap-2.5 border rounded-[2px] px-3 py-2.5 text-[13px] cursor-pointer transition ${
                  on ? 'border-[var(--accent)] bg-[rgba(180,85,31,0.05)]' : 'border-[var(--rule)] hover:border-[var(--rule-strong)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) =>
                    setTeam((t) => (e.target.checked ? [...t, r.id] : t.filter((x) => x !== r.id)))
                  }
                  className="accent-[var(--accent)]"
                />
                <span className="flex-1 min-w-0">
                  {r.name}
                  {r.zone && <span className="block text-[11px] text-[var(--ink-faint)]">{r.zone}</span>}
                </span>
                {lead && <span className="wsale-overline text-[var(--accent)]">Responsable</span>}
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="wsale-overline">Tipo</span>
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="wsale-input mt-1.5">
            <option value="evento">Evento</option>
            <option value="campana">Campaña</option>
            <option value="capacitacion">Capacitación</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label className="block">
          <span className="wsale-overline">Cliente</span>
          <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="wsale-input mt-1.5">
            <option value="">Sin cliente puntual</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="wsale-overline">Inicia</span>
          <input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} className="wsale-input mt-1.5" />
        </label>
        <label className="block">
          <span className="wsale-overline">Termina</span>
          <input type="date" value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} className="wsale-input mt-1.5" />
        </label>
      </div>

      <label className="block">
        <span className="wsale-overline">Inversión estimada</span>
        <input type="number" step="1000" value={form.budget_amount}
          onChange={(e) => setForm({ ...form, budget_amount: e.target.value })} className="wsale-input mt-1.5" />
      </label>

      <label className="block">
        <span className="wsale-overline">Objetivo del proyecto</span>
        <textarea
          rows={3} value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Qué se busca, qué necesita cada quien, cómo se mide el cierre."
          className="mt-1.5 w-full rounded-[2px] border border-[var(--rule-strong)] bg-white p-3 text-[13px] outline-none focus:border-[var(--accent)]"
        />
      </label>

      {error && <p className="wsale-bad text-[12px]">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving || team.length === 0} className="wsale-btn">
          {saving ? 'Creando…' : 'Crear proyecto'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="wsale-btn-ghost">Cancelar</button>
      </div>
    </form>
  );
}
