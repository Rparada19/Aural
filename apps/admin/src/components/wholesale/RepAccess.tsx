'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRepAccess, linkRepAccess, unlinkRepAccess } from '@/app/actions/wholesale';
import { Field, inputClass } from './Field';

export interface LinkedProfile {
  id: string;
  full_name: string;
  email: string | null;
}

export function RepAccess({
  repId, repName, repEmail, linked, candidates,
}: {
  repId: string;
  repName: string;
  repEmail: string | null;
  linked: LinkedProfile | null;
  candidates: LinkedProfile[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'create' | 'link'>('idle');
  const [form, setForm] = useState({ email: repEmail ?? '', password: '' });
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setMode('idle');
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar');
    } finally {
      setBusy(false);
    }
  }

  if (linked) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm">
            Entra como <span className="font-medium">{linked.email ?? linked.full_name}</span>
          </p>
          <p className="text-secondary text-xs mt-0.5">
            Ve solo su cartera, su agenda y sus objetivos.
          </p>
        </div>
        <button
          onClick={() => run(() => unlinkRepAccess(repId, linked.id))}
          disabled={busy}
          className="text-secondary text-xs hover:text-danger disabled:opacity-50 whitespace-nowrap"
        >
          Quitar acceso
        </button>
      </div>
    );
  }

  return (
    <div>
      {mode === 'idle' && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-secondary text-sm">
            {done ? 'Acceso actualizado.' : 'Este comercial todavía no puede entrar al sistema.'}
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setMode('create')}
              className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-soft transition"
            >
              Crear usuario
            </button>
            {candidates.length > 0 && (
              <button
                onClick={() => setMode('link')}
                className="h-9 px-4 rounded-lg border border-border text-sm hover:border-primary transition"
              >
                Vincular existente
              </button>
            )}
          </div>
        </div>
      )}

      {mode === 'create' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createRepAccess({
              rep_id: repId,
              full_name: repName,
              email: form.email,
              password: form.password,
            }));
          }}
          className="space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Correo">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Contraseña temporal" hint="Mínimo 8 caracteres. Que la cambie al entrar.">
              <input
                required
                type="text"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-soft disabled:opacity-50 transition"
            >
              {busy ? 'Creando…' : 'Crear acceso'}
            </button>
            <button
              type="button"
              onClick={() => setMode('idle')}
              className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-surface transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {mode === 'link' && (
        <div className="space-y-3">
          <Field label="Usuario existente">
            <select value={pick} onChange={(e) => setPick(e.target.value)} className={inputClass}>
              <option value="">Selecciona…</option>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name} · {p.email}</option>
              ))}
            </select>
          </Field>
          {error && <p className="text-danger text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => pick && run(() => linkRepAccess(repId, pick))}
              disabled={busy || !pick}
              className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-soft disabled:opacity-50 transition"
            >
              {busy ? 'Vinculando…' : 'Vincular'}
            </button>
            <button
              onClick={() => setMode('idle')}
              className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-surface transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
