'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setBlocked, setModules, setRole, removeAccess, resendLink, grantAccess } from '@/app/actions/access';
import { MODULES, COORDINATION_ONLY, DEFAULT_MODULES, type WholesaleRole } from '@/lib/wholesale-roles';

export interface Person {
  id: string; name: string; email: string; role: WholesaleRole; blocked: boolean;
  modules: string[] | null; repName: string | null; lastSeen: string | null; locked: boolean;
}

const ROLE_OPTS: { value: string; role: WholesaleRole; label: string }[] = [
  { value: 'wholesale_rep', role: 'rep', label: 'Comercial' },
  { value: 'wholesale_assistant', role: 'assistant', label: 'Servicio al cliente' },
  { value: 'wholesale_coordinator', role: 'coordinator', label: 'Coordinación' },
];
const ASSIGNABLE = MODULES.filter((m) => !COORDINATION_ONLY.includes(m.key));

function useRun() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function run(fn: () => Promise<unknown>, ok?: string) {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg({ ok: true, text: ok }); router.refresh(); return true; }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo guardar' }); return false; }
    finally { setBusy(false); }
  }
  return { busy, msg, run };
}

function since(d: string | null) {
  if (!d) return 'Nunca ha entrado';
  const days = Math.floor((Date.now() - Date.parse(d)) / 86_400_000);
  return days === 0 ? 'Entró hoy' : days === 1 ? 'Entró ayer' : `Entró hace ${days} días`;
}

function PersonRow({ p, isAdmin }: { p: Person; isAdmin: boolean }) {
  const { busy, msg, run } = useRun();
  const [open, setOpen] = useState(false);
  const current = p.modules ?? DEFAULT_MODULES[p.role];
  const [sel, setSel] = useState<string[]>(current);
  const custom = p.modules !== null;
  const canEdit = !p.locked && (isAdmin || p.role !== 'coordinator');

  return (
    <li className={`py-4 ${p.blocked ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <p className="text-[14px]">
            {p.name}
            {p.blocked && <span className="ml-2 text-[11px] wsale-bad font-semibold">BLOQUEADO</span>}
          </p>
          <p className="text-[11px] text-[var(--ink-faint)]">{p.email} · {since(p.lastSeen)}{p.repName ? ` · ficha: ${p.repName}` : ''}</p>
        </div>

        {canEdit ? (
          <select disabled={busy} value={ROLE_OPTS.find((o) => o.role === p.role)?.value}
            onChange={(e) => run(() => setRole(p.id, e.target.value as never), 'Perfil actualizado')}
            className="wsale-input !w-auto !h-9 text-[13px]">
            {ROLE_OPTS.filter((o) => isAdmin || o.role !== 'coordinator').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : (
          <span className="text-[13px] text-[var(--ink-soft)]">{p.locked ? 'Administrador' : 'Coordinación'}</span>
        )}

        {canEdit && (
          <div className="flex gap-2">
            {p.role !== 'coordinator' && (
              <button className="wsale-btn-ghost !text-[12px]" onClick={() => setOpen(!open)}>{open ? 'Cerrar' : 'Qué ve'}</button>
            )}
            <button disabled={busy} className={p.blocked ? 'wsale-btn !text-[12px]' : 'wsale-btn-ghost !text-[12px] !text-[var(--alert)]'}
              onClick={() => run(() => setBlocked(p.id, !p.blocked), p.blocked ? 'Desbloqueado: ya puede entrar' : 'Bloqueado: ya no puede entrar')}>
              {p.blocked ? 'Desbloquear' : 'Bloquear'}
            </button>
          </div>
        )}
      </div>

      {open && canEdit && (
        <div className="mt-3 ml-1 p-4 bg-[var(--paper)] border border-[var(--rule)] rounded-[3px] space-y-3">
          <p className="text-[12px] text-[var(--ink-soft)]">
            Marca las secciones que {p.name.split(' ')[0]} puede ver. {custom ? 'Tiene una configuración propia.' : 'Hoy ve lo de su perfil.'}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ASSIGNABLE.map((m) => (
              <label key={m.key} className="flex items-start gap-2 text-[13px] cursor-pointer">
                <input type="checkbox" className="mt-1" checked={sel.includes(m.key)}
                  onChange={(e) => setSel((s) => e.target.checked ? [...s, m.key] : s.filter((x) => x !== m.key))} />
                <span>{m.label}<span className="block text-[11px] text-[var(--ink-faint)]">{m.hint}</span></span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button disabled={busy} className="wsale-btn !text-[12px]" onClick={() => run(() => setModules(p.id, sel), 'Secciones guardadas')}>Guardar</button>
            {custom && (
              <button disabled={busy} className="wsale-btn-ghost !text-[12px]"
                onClick={() => run(() => setModules(p.id, null), 'Volvió a lo de su perfil').then(() => setSel(DEFAULT_MODULES[p.role]))}>Volver a lo de su perfil</button>
            )}
            <span className="flex-1" />
            <button disabled={busy} className="wsale-btn-ghost !text-[12px]" onClick={() => run(() => resendLink(p.id), 'Le llegó un correo para crear su clave')}>Enviar correo para crear clave</button>
            <button disabled={busy} className="wsale-btn-ghost !text-[12px] !text-[var(--alert)]"
              onClick={() => confirm(`¿Quitarle a ${p.name} el acceso a wholesale?`) && run(() => removeAccess(p.id))}>Quitar acceso</button>
          </div>
        </div>
      )}
      {msg && <p className={`text-[12px] mt-2 ${msg.ok ? 'wsale-good' : 'wsale-bad'}`}>{msg.text}</p>}
    </li>
  );
}

export function PeopleList({ people, isAdmin }: { people: Person[]; isAdmin: boolean }) {
  return (
    <ul className="divide-y divide-[var(--rule)]">
      {people.map((p) => <PersonRow key={p.id} p={p} isAdmin={isAdmin} />)}
    </ul>
  );
}

export function GrantAccess({
  isAdmin, suggestions,
}: { isAdmin: boolean; suggestions: { name: string; email: string; role: string; area: string }[] }) {
  const { busy, msg, run } = useRun();
  const [f, setF] = useState({ full_name: '', email: '', role: 'wholesale_assistant' });

  return (
    <div className="space-y-4">
      {suggestions.length > 0 && (
        <div>
          <p className="text-[12px] text-[var(--ink-soft)] mb-2">Del equipo de Margarita en el programa de servicio, aún sin acceso aquí. Haz clic para llenar el formulario:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s.email} className="wsale-chip" onClick={() => setF({ full_name: s.name, email: s.email, role: s.role })}>
                {s.name} <span className="text-[var(--ink-faint)]">· {s.area}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_200px_auto] items-end">
        <label className="block"><span className="text-[11px] text-[var(--ink-soft)]">Nombre</span>
          <input value={f.full_name} onChange={(e) => setF((s) => ({ ...s, full_name: e.target.value }))} className="wsale-input" /></label>
        <label className="block"><span className="text-[11px] text-[var(--ink-soft)]">Correo</span>
          <input type="email" value={f.email} onChange={(e) => setF((s) => ({ ...s, email: e.target.value }))} className="wsale-input" /></label>
        <label className="block"><span className="text-[11px] text-[var(--ink-soft)]">Perfil</span>
          <select value={f.role} onChange={(e) => setF((s) => ({ ...s, role: e.target.value }))} className="wsale-input">
            {ROLE_OPTS.filter((o) => isAdmin || o.role !== 'coordinator').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></label>
        <button disabled={busy} className="wsale-btn h-11"
          onClick={() => run(() => grantAccess(f as never), `Listo: a ${f.email} le llegó un correo para crear su clave`).then((ok) => ok && setF({ full_name: '', email: '', role: f.role }))}>
          {busy ? 'Dando acceso…' : 'Dar acceso'}
        </button>
      </div>
      {msg && <p className={`text-[13px] ${msg.ok ? 'wsale-good' : 'wsale-bad'}`}>{msg.text}</p>}
    </div>
  );
}
