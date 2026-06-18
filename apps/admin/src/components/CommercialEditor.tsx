'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePatient } from '@/app/actions/patients';

interface Item { id: string; label: string }
interface Props {
  patientId: string;
  professionalId: string;
  initial: {
    technology_id: string | null;
    platform_id: string | null;
    rechargeable: boolean | null;
    binaural: boolean | null;
    location_id: string | null;
    unit_price: number | null;
    total_price: number | null;
    sale_closed: boolean;
    is_opportunity: boolean;
    discount_percent: number;
  };
  technologies: Item[];
  platforms: Item[];
  locations: Item[];
}

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function CommercialEditor({ patientId, professionalId, initial, technologies, platforms, locations }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [techId, setTechId] = useState(initial.technology_id ?? '');
  const [platId, setPlatId] = useState(initial.platform_id ?? '');
  const [recharge, setRecharge] = useState<string>(initial.rechargeable === null ? '' : initial.rechargeable ? 'true' : 'false');
  const [binaural, setBinaural] = useState<string>(initial.binaural === null ? '' : initial.binaural ? 'true' : 'false');
  const [locId, setLocId] = useState(initial.location_id ?? '');
  const [unit, setUnit] = useState(initial.unit_price ? String(initial.unit_price) : '');
  const [discount, setDiscount] = useState(initial.discount_percent ? String(initial.discount_percent) : '0');
  const [total, setTotal] = useState(initial.total_price ? String(initial.total_price) : '');
  const [closed, setClosed] = useState<boolean>(initial.sale_closed);
  const [opportunity, setOpportunity] = useState<boolean>(initial.is_opportunity);
  const [totalEdited, setTotalEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const recompute = (u: string, b: string, disc: string) => {
    if (totalEdited) return;
    if (!u) { setTotal(''); return; }
    const v = Number(u);
    if (!Number.isFinite(v)) return;
    const factor = b === 'true' ? 2 : 1;
    const dPct = Math.max(0, Math.min(100, Number(disc) || 0));
    const subtotal = v * factor;
    const final = subtotal * (1 - dPct / 100);
    setTotal(String(Math.round(final)));
  };

  const listPrice = (() => {
    const v = Number(unit);
    if (!Number.isFinite(v)) return 0;
    return v * (binaural === 'true' ? 2 : 1);
  })();
  const discountAmount = listPrice * (Number(discount) / 100);

  function save() {
    setError(null); setSuccess(null);
    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {
          technology_id: techId || null,
          platform_id: platId || null,
          rechargeable: recharge === '' ? null : recharge === 'true',
          binaural: binaural === '' ? null : binaural === 'true',
          location_id: locId || null,
          unit_price: unit ? Number(unit) : null,
          total_price: total ? Number(total) : null,
          discount_percent: Number(discount) || 0,
          sale_closed: closed,
          is_opportunity: opportunity && !closed,
        };
        if (total && !initial.sale_closed && !closed) payload.funnel_status = 'quoted';
        await updatePatient(patientId, professionalId, payload);
        setSuccess('Guardado.');
        router.refresh();
      } catch (e: any) {
        setError(e?.message ?? 'Error al guardar.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select label="Tecnología" value={techId} onChange={setTechId} options={technologies} />
        <Select label="Plataforma" value={platId} onChange={setPlatId} options={platforms} />
        <Select label="Sede" value={locId} onChange={setLocId} options={locations} />
        <BoolSelect label="Recargable" value={recharge} onChange={setRecharge} />
        <BoolSelect label="Binauralidad" value={binaural} onChange={(v) => { setBinaural(v); recompute(unit, v, discount); }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Valor unitario</span>
          <input
            type="number" min="0" step="1" value={unit}
            onChange={(e) => { setUnit(e.target.value); recompute(e.target.value, binaural, discount); }}
            className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Descuento %</span>
          <input
            type="number" min="0" max="100" step="0.5" value={discount}
            onChange={(e) => { setDiscount(e.target.value); recompute(unit, binaural, e.target.value); }}
            className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Valor total (final)</span>
          <input
            type="number" min="0" step="1" value={total}
            onChange={(e) => { setTotal(e.target.value); setTotalEdited(true); }}
            className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
          />
        </label>
      </div>

      {listPrice > 0 && Number(discount) > 0 && (
        <div className="bg-surface border border-border rounded-md p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-secondary">Subtotal (sin descuento)</span><span className="text-foreground">{cop(listPrice)}</span></div>
          <div className="flex justify-between"><span className="text-warning">Descuento ({discount}%)</span><span className="text-warning">−{cop(discountAmount)}</span></div>
          <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1"><span className="text-primary">Total final</span><span className="text-primary">{cop(Number(total) || 0)}</span></div>
        </div>
      )}

      <div className="pt-2 space-y-2">
        {total && !closed && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={opportunity} onChange={(e) => setOpportunity(e.target.checked)} className="w-4 h-4 accent-warning" />
            <span className="text-sm font-semibold text-warning">Oportunidad activa</span>
            <span className="text-xs text-secondary">(seguimiento de cierre)</span>
          </label>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} className="w-4 h-4 accent-primary" />
          <span className="text-sm font-semibold text-primary">Venta cerrada</span>
        </label>
        {closed && total && (
          <p className="text-sm text-success mt-2">Comisión médica (10%): {cop(Number(total) * 0.1)}</p>
        )}
      </div>

      {error && <p className="text-danger text-sm bg-danger/10 px-3 py-2 rounded-md">{error}</p>}
      {success && <p className="text-success text-sm bg-success/10 px-3 py-2 rounded-md">{success}</p>}

      <div className="pt-2">
        <button onClick={save} disabled={isPending} className="px-5 h-11 rounded-md bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-50">
          {isPending ? 'Guardando…' : 'Guardar comercial'}
        </button>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Item[] }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary">
        <option value="">—</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
}
function BoolSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary">
        <option value="">—</option>
        <option value="true">Sí</option>
        <option value="false">No</option>
      </select>
    </label>
  );
}
