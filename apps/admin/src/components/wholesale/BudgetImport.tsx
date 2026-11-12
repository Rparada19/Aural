'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { previewBudgetFile, importBudgets, type ZonePreview } from '@/app/actions/budget-import';
import type { ZoneMonth } from '@/lib/budget-excel';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export function BudgetImport({ defaultYear }: { defaultYear: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(defaultYear);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ rows: ZoneMonth[]; zones: ZonePreview[]; skipped: number } | null>(null);
  const [done, setDone] = useState<number | null>(null);

  function close() { setOpen(false); setPreview(null); setError(null); setDone(null); }

  async function read(file: File) {
    setBusy(true); setError(null); setPreview(null);
    const fd = new FormData();
    fd.set('file', file); fd.set('year', String(year));
    try { const r = await previewBudgetFile(fd); setPreview(r); }
    catch (e) { setError(e instanceof Error ? e.message : 'No pude leer el archivo'); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!preview) return;
    setBusy(true); setError(null);
    try { const n = await importBudgets(year, preview.rows); setDone(n); setPreview(null); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar'); }
    finally { setBusy(false); }
  }

  if (!open) return <button className="wsale-btn" onClick={() => setOpen(true)}>Subir Excel</button>;

  const total = preview?.zones.reduce((a, r) => a + r.amount, 0) ?? 0;
  const units = preview?.zones.reduce((a, r) => a + r.units, 0) ?? 0;
  const cost = preview?.zones.reduce((a, r) => a + r.cost, 0) ?? 0;
  const prev = preview?.zones.reduce((a, r) => a + r.prev_amount, 0) ?? 0;
  const replacing = preview?.zones.filter((r) => r.replaces).length ?? 0;
  const unknown = preview?.zones.filter((r) => !r.known) ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center overflow-y-auto p-6" onClick={() => !busy && close()}>
      <div onClick={(e) => e.stopPropagation()} className="wsale-panel bg-[var(--paper-raised)] p-6 w-full max-w-3xl space-y-6 mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="wsale-display text-[20px]">Subir presupuesto en Excel</h2>
          <button className="text-[12px] text-[var(--ink-soft)]" onClick={close}>Cerrar</button>
        </div>

        {done !== null ? (
          <div className="space-y-4">
            <p className="text-[15px] wsale-good">Listo: quedó cargado el presupuesto {year} de {done} zona{done === 1 ? '' : 's'}.</p>
            <button className="wsale-btn" onClick={() => { close(); router.push(`/wholesale/budgets?year=${year}`); }}>Ver presupuesto {year}</button>
          </div>
        ) : !preview ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold mr-1">Año:</span>
              {[defaultYear - 1, defaultYear, defaultYear + 1].map((y) => (
                <button key={y} className="wsale-chip" data-on={year === y} onClick={() => setYear(y)}>{y}</button>
              ))}
            </div>

            <ol className="space-y-4 text-[13px]">
              <li>
                <p className="font-semibold mb-1">1. Descarga la plantilla</p>
                <p className="text-[var(--ink-soft)] mb-2">Una fila por zona y mes, con las ventas de {year - 1} como guía y lo que ya esté cargado para {year}.</p>
                <a href={`/wholesale/budgets/plantilla?year=${year}`} className="wsale-btn-ghost inline-block">Descargar plantilla {year}</a>
              </li>
              <li>
                <p className="font-semibold mb-1">2. Llénala en Excel y guárdala</p>
                <p className="text-[var(--ink-soft)]">Unidades, presupuesto de ventas y costo de venta, en pesos y sin puntos ni signos.</p>
              </li>
              <li>
                <p className="font-semibold mb-2">3. Súbela aquí</p>
                <label className={`flex items-center justify-center border-2 border-dashed border-[var(--rule)] rounded-[4px] py-8 cursor-pointer hover:border-[var(--accent)] ${busy ? 'opacity-60' : ''}`}>
                  <input type="file" accept=".xlsx" className="hidden" disabled={busy} onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
                  <span className="text-[14px] text-[var(--accent)]">{busy ? 'Leyendo el archivo…' : 'Elegir archivo .xlsx'}</span>
                </label>
              </li>
            </ol>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="wsale-panel p-3"><p className="wsale-overline">Presupuesto {year}</p><p className="wsale-figure text-[18px]">{cop(total)}</p></div>
              <div className="wsale-panel p-3"><p className="wsale-overline">Unidades</p><p className="wsale-figure text-[18px]">{units.toLocaleString('es-CO')}</p></div>
              <div className="wsale-panel p-3"><p className="wsale-overline">Margen</p><p className="wsale-figure text-[18px]">{total ? `${Math.round((total - cost) / total * 100)}%` : '—'}</p></div>
              <div className="wsale-panel p-3"><p className="wsale-overline">Crecimiento vs {year - 1}</p><p className="wsale-figure text-[18px]">{prev ? `${total >= prev ? '+' : ''}${Math.round((total / prev - 1) * 100)}%` : '—'}</p></div>
            </div>

            {replacing > 0 && (
              <p className="text-[13px] wsale-warn">{replacing} zona{replacing === 1 ? ' ya tenía' : 's ya tenían'} presupuesto {year}: se reemplaza con lo del archivo.</p>
            )}
            {unknown.length > 0 && (
              <p className="text-[13px] wsale-warn">Ninguno de tus clientes tiene asignada la zona {unknown.map((u) => `“${u.zone}”`).join(', ')}. Se carga igual; revisa que esté escrita como en las fichas de los clientes.</p>
            )}
            {preview.skipped > 0 && <p className="text-[12px] text-[var(--ink-soft)]">Ignoré {preview.skipped} fila{preview.skipped === 1 ? '' : 's'} sin zona o mes (por ejemplo, totales).</p>}

            <div className="max-h-[320px] overflow-y-auto border border-[var(--rule)] rounded-[3px]">
              <table className="wsale-table">
                <thead><tr><th>Zona</th><th className="num">{year - 1}</th><th className="num">Presupuesto</th><th className="num">Unidades</th><th className="num">Margen</th><th className="num">Meses</th></tr></thead>
                <tbody>
                  {preview.zones.map((z) => (
                    <tr key={z.zone}>
                      <td>{z.zone}{z.replaces && <span className="text-[10px] wsale-warn"> · reemplaza</span>}</td>
                      <td className="num text-[var(--ink-soft)]">{cop(z.prev_amount)}</td>
                      <td className="num">{cop(z.amount)}</td>
                      <td className="num">{z.units}</td>
                      <td className="num">{z.amount ? `${Math.round((z.amount - z.cost) / z.amount * 100)}%` : '—'}</td>
                      <td className={`num ${z.months < 12 ? 'wsale-warn' : ''}`}>{z.months}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button className="wsale-btn-ghost" disabled={busy} onClick={() => setPreview(null)}>Subir otro archivo</button>
              <button className="wsale-btn" disabled={busy || preview.rows.length === 0} onClick={confirm}>
                {busy ? 'Cargando…' : `Cargar presupuesto de ${preview.zones.length} zona${preview.zones.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}
        {error && <p className="wsale-bad text-[13px]">{error}</p>}
      </div>
    </div>
  );
}
