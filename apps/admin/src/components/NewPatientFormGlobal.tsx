'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPatient } from '@/app/actions/patients';
import { CASE_TYPE_LABEL } from '@aural/shared';

interface City { id: string; name: string }
interface Pro { id: string; label: string }
interface Opt { id: string; label: string }
interface Audio { id: string; name: string; locationId: string | null }

export function NewPatientFormGlobal({
  professionals, cities, visitors, locations, audiologists,
}: {
  professionals: Pro[];
  cities: City[];
  visitors: Opt[];
  locations: Opt[];
  audiologists: Audio[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [proId, setProId] = useState('');
  const [visitorId, setVisitorId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [audiologistId, setAudiologistId] = useState('');
  const [caseType, setCaseType] = useState('sale_candidate');

  // Filtrar audiólogos por sede seleccionada
  const filteredAudios = useMemo(() => {
    if (!locationId) return audiologists;
    return audiologists.filter((a) => a.locationId === locationId || a.locationId === null);
  }, [locationId, audiologists]);

  async function onSubmit(formData: FormData) {
    setError(null);
    if (!proId) { setError('Selecciona un profesional.'); return; }
    const payload = {
      full_name: String(formData.get('full_name') ?? ''),
      cedula: String(formData.get('cedula') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      email: String(formData.get('email') ?? '') || null,
      city_id: String(formData.get('city_id') ?? '') || null,
      notes: String(formData.get('notes') ?? '') || null,
      visitor_id: visitorId || null,
      location_id: locationId || null,
      audiologist_id: audiologistId || null,
      case_type: caseType,
    };
    if (!payload.full_name || !payload.cedula || !payload.phone) {
      setError('Nombre, cédula y teléfono son obligatorios.');
      return;
    }
    startTransition(async () => {
      try {
        const p = await createPatient(proId, payload);
        router.push(`/users/${proId}/patients/${p.id}`);
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'No se pudo crear el paciente.');
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Profesional asignado (otorrino/audiólogo) *</span>
        <select value={proId} onChange={(e) => setProId(e.target.value)} required className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary">
          <option value="">Selecciona un profesional…</option>
          {professionals.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Visitador médico</span>
          <select value={visitorId} onChange={(e) => setVisitorId(e.target.value)} className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary">
            <option value="">—</option>
            {visitors.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Centro auditivo (sede)</span>
          <select value={locationId} onChange={(e) => { setLocationId(e.target.value); setAudiologistId(''); }} className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary">
            <option value="">—</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Tipo de caso</span>
        <select value={caseType} onChange={(e) => setCaseType(e.target.value)} className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary">
          {Object.entries(CASE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <p className="text-xs text-secondary mt-1">Si no es candidato a venta no entra al embudo comercial pero el médico lo verá igual.</p>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Audiólogo que lo atiende</span>
        <select value={audiologistId} onChange={(e) => setAudiologistId(e.target.value)} className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary">
          <option value="">—</option>
          {filteredAudios.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {locationId && <p className="text-xs text-secondary mt-1">Filtrado por sede.</p>}
      </label>

      <hr className="border-border" />

      <Field name="full_name" label="Nombre completo del paciente" required />
      <Field name="cedula" label="Cédula" required />
      <Field name="phone" label="Teléfono" required />
      <Field name="email" label="Correo (opcional)" type="email" />

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Ciudad del paciente</span>
        <select name="city_id" className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary">
          <option value="">—</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Observaciones</span>
        <textarea name="notes" rows={3} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary" />
      </label>

      {error && <p className="text-danger text-sm">{error}</p>}

      <button type="submit" disabled={isPending} className="px-5 h-11 rounded-md bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-50">
        {isPending ? 'Creando…' : 'Crear paciente'}
      </button>
    </form>
  );
}

function Field({ name, label, required, type = 'text' }: { name: string; label: string; required?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">{label}{required ? ' *' : ''}</span>
      <input name={name} type={type} required={required} className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary" />
    </label>
  );
}
