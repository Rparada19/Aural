'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAdminStaff } from '@/app/actions/staff';

interface Visitor { id: string; name: string }

export function NewStaffForm({ visitors }: { visitors: Visitor[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'coordinator' | 'csr' | 'visitor_rep'>('csr');
  const [linkedVisitor, setLinkedVisitor] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!name || !email || password.length < 8) {
      setError('Nombre, correo y contraseña (≥8 caracteres) son obligatorios.');
      return;
    }
    if (role === 'visitor_rep' && !linkedVisitor) {
      setError('Selecciona el visitador vinculado.');
      return;
    }
    startTransition(async () => {
      try {
        await createAdminStaff({
          full_name: name, email, password, admin_role: role,
          linked_visitor_id: role === 'visitor_rep' ? linkedVisitor : null,
          phone, city,
        });
        router.push('/staff');
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <Field label="Nombre completo *" value={name} onChange={setName} />
      <Field label="Correo *" value={email} onChange={setEmail} type="email" />
      <Field label="Contraseña inicial (mín. 8) *" value={password} onChange={setPassword} type="password" />

      <label className="block">
        <span className={lbl}>Rol *</span>
        <select value={role} onChange={(e) => setRole(e.target.value as any)} className={inp}>
          <option value="coordinator">Coordinador — acceso total</option>
          <option value="csr">Servicio al cliente — gestiona CRM de todos</option>
          <option value="visitor_rep">Visitador médico — ve solo sus médicos</option>
        </select>
      </label>

      {role === 'visitor_rep' && (
        <label className="block">
          <span className={lbl}>Visitador vinculado *</span>
          <select value={linkedVisitor} onChange={(e) => setLinkedVisitor(e.target.value)} className={inp}>
            <option value="">Selecciona…</option>
            {visitors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <p className="text-xs text-secondary mt-1">Este usuario verá los médicos asignados al visitador seleccionado.</p>
        </label>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Teléfono" value={phone} onChange={setPhone} />
        <Field label="Ciudad" value={city} onChange={setCity} />
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <button onClick={submit} disabled={isPending} className="px-5 h-11 rounded-md bg-primary text-white font-semibold disabled:opacity-50">
        {isPending ? 'Creando…' : 'Crear miembro'}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className={lbl}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} type={type} className={inp} />
    </label>
  );
}

const lbl = 'text-xs font-semibold uppercase tracking-wider text-secondary';
const inp = 'mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary';
