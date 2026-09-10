'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateMyProfile } from '@/app/actions/wholesale';

export interface RepProfile {
  id: string;
  name: string;
  zone: string | null;
  job_title: string | null;
  document_id: string | null;
  started_on: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  city: string | null;
  bio: string | null;
  is_active: boolean;
}

/** Datos que la persona mantiene. Los que definen su rol en el canal
 *  se muestran al lado, en solo lectura y con su motivo. */
export function ProfileForm({ rep }: { rep: RepProfile }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateMyProfile(new FormData(e.currentTarget));
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="wsale-panel p-6 space-y-5">
      <div>
        <h2 className="wsale-display text-[17px]">Mis datos</h2>
        <p className="text-[11px] text-[var(--ink-faint)] mt-1 pb-4 border-b border-[var(--rule)]">
          Esto lo mantienes tú. Se ve en la ficha que consulta coordinación.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="wsale-overline">Celular</span>
          <input name="mobile" defaultValue={rep.mobile ?? ''} className="wsale-input mt-1.5" />
        </label>
        <label className="block">
          <span className="wsale-overline">Teléfono fijo</span>
          <input name="phone" defaultValue={rep.phone ?? ''} className="wsale-input mt-1.5" />
        </label>
        <label className="block">
          <span className="wsale-overline">Correo</span>
          <input type="email" name="email" defaultValue={rep.email ?? ''} className="wsale-input mt-1.5" />
        </label>
        <label className="block">
          <span className="wsale-overline">Ciudad de residencia</span>
          <input name="city" defaultValue={rep.city ?? ''} className="wsale-input mt-1.5" />
        </label>
      </div>

      <label className="block">
        <span className="wsale-overline">Nota</span>
        <textarea
          name="bio"
          rows={2}
          defaultValue={rep.bio ?? ''}
          placeholder="Algo que el equipo deba saber: horario, disponibilidad, lo que sea."
          className="mt-1.5 w-full rounded-[2px] border border-[var(--rule-strong)] bg-white p-3 text-[13px] outline-none focus:border-[var(--accent)]"
        />
      </label>

      <label className="block">
        <span className="wsale-overline">Foto</span>
        <input
          type="file"
          name="photo"
          accept="image/*"
          className="mt-1.5 block text-[12px] file:mr-3 file:h-9 file:px-4 file:rounded-[2px] file:border file:border-[var(--rule-strong)] file:bg-white file:text-[12px] file:cursor-pointer"
        />
      </label>

      {error && <p className="wsale-bad text-[12px]">{error}</p>}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={saving} className="wsale-btn">
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {saved && <span className="wsale-good text-[12px]">Guardado</span>}
      </div>
    </form>
  );
}

/** Lo que solo coordinación cambia. Se muestra para que la persona sepa
 *  qué hay registrado, con el motivo de por qué no lo edita. */
export function AssignmentPanel({ rep }: { rep: RepProfile }) {
  const rows: [string, string | null, string][] = [
    ['Zona asignada', rep.zone, 'De ella dependen tu cartera y tu presupuesto'],
    ['Cargo', rep.job_title, 'Lo define coordinación'],
    ['Documento', rep.document_id, 'Dato de nómina'],
    ['Ingreso', rep.started_on, 'Dato de nómina'],
    ['Estado', rep.is_active ? 'Activo' : 'Inactivo', 'Solo coordinación da de baja'],
  ];

  return (
    <aside className="wsale-panel p-6">
      <h2 className="wsale-display text-[17px]">Asignación</h2>
      <p className="text-[11px] text-[var(--ink-faint)] mt-1 pb-4 border-b border-[var(--rule)]">
        Lo mantiene coordinación. Si algo está mal, escríbeles.
      </p>

      <dl className="space-y-4 mt-4">
        {rows.map(([label, value, why]) => (
          <div key={label}>
            <dt className="wsale-overline">{label}</dt>
            <dd className="text-[13px] mt-1">{value ?? <span className="text-[var(--ink-faint)]">Sin definir</span>}</dd>
            <p className="text-[10px] text-[var(--ink-faint)] mt-0.5">{why}</p>
          </div>
        ))}
      </dl>
    </aside>
  );
}
