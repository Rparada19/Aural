'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { previewBudgetFile, importBudgets, type PreviewRow } from '@/app/actions/budget-import';

const cop = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

export function BudgetImport({ defaultYear }: { defaultYear: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(defaultYear);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ rows: PreviewRow[]; unknown: { nit: string; name: string; total: number }[] } | null>(null);
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

  const total = preview?.rows.reduce((a, r) => a + r.total, 0) ?? 0;
  const units = preview?.rows.reduce((a, r) => a + r.totalUnits, 0) ?? 0;
  const replacing = preview?.rows.filter((r) => r.replaces).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center overflow-y-auto p-6" onClick={() => !busy && close()}>
      <div onClick={(e) => e.stopPropagation()} className="wsale-panel bg-[var(--paper-raised)] p-6 w-full max-w-3xl space-y-6 mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="wsale-display text-[20px]">Subir presupuesto en Excel</h2>
          <button className="text-[12px] text-[var(--ink-soft)]" onClick={close}>Cerrar</button>
        </div>

        {done !== null ? (
          <div className="space-y-4">
            <p className="text-[15px] wsale-good">Listo: quedó cargado el presupuesto {year} de {done} cliente{done === 1 ? '' : 's'}.</p>
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
                <p className="text-[var(--ink-soft)] mb-2">Trae todos los clientes y lo que ya esté cargado para {year}. Tiene una hoja de Valor y otra de Unidades, un mes por columna.</p>
                <a href={`/wholesale/budgets/plantilla?year=${year}`} className="wsale-btn-ghost inline-block">Descargar plantilla {year}</a>
              </li>
              <li>
                <p className="font-semibold mb-1">2. Llénala en Excel y guárdala</p>
                <p className="text-[var(--ink-soft)]">Valores en pesos, sin puntos ni signos. Las celdas vacías quedan en cero.</p>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="wsale-panel p-3"><p className="wsale-overline">Clientes</p><p className="wsale-figure text-[20px]">{preview.rows.length}</p></div>
              <div className="wsale-panel p-3"><p className="wsale-overline">Valor {year}</p><p className="wsale-figure text-[20px]">{cop(total)}</p></div>
              <div className="wsale-panel p-3"><p className="wsale-overline">Unidades</p><p className="wsale-figure text-[20px]">{units.toLocaleString('es-CO')}</p></div>
            </div>

            {replacing > 0 && (
              <p className="text-[13px] wsale-warn">{replacing} cliente{replacing === 1 ? ' ya tenía' : 's ya tenían'} presupuesto {year}: se reemplaza con lo del archivo.</p>
            )}
            {preview.unknown.length > 0 && (
              <div className="border-l-2 border-[var(--alert)] bg-[rgba(166,50,40,0.05)] px-4 py-3">
                <p className="text-[13px] font-semibold">No reconocí {preview.unknown.length} fila{preview.unknown.length === 1 ? '' : 's'}; no se cargan:</p>
                <ul className="text-[12px] mt-1 space-y-0.5">
                  {preview.unknown.slice(0, 15).map((u, i) => <li key={i}>{u.name || '(sin nombre)'}{u.nit ? ` · NIT ${u.nit}` : ''} · {cop(u.total)}</li>)}
                </ul>
                <p className="text-[11px] text-[var(--ink-soft)] mt-1">Revisa que el NIT o el nombre estén igual que en Clientes, o crea primero el cliente.</p>
              </div>
            )}

            <div className="max-h-[320px] overflow-y-auto border border-[var(--rule)] rounded-[3px]">
              <table className="wsale-table">
                <thead><tr><th>Cliente</th><th>Zona</th><th className="num">Valor año</th><th className="num">Unidades</th></tr></thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.client_id}>
                      <td>{r.name}{r.replaces && <span className="text-[10px] wsale-warn"> · reemplaza</span>}</td>
                      <td className="text-[var(--ink-soft)]">{r.zone ?? '—'}</td>
                      <td className="num">{cop(r.total)}</td>
                      <td className="num">{r.totalUnits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button className="wsale-btn-ghost" disabled={busy} onClick={() => setPreview(null)}>Subir otro archivo</button>
              <button className="wsale-btn" disabled={busy || preview.rows.length === 0} onClick={confirm}>
                {busy ? 'Cargando…' : `Cargar presupuesto de ${preview.rows.length} clientes`}
              </button>
            </div>
          </>
        )}
        {error && <p className="wsale-bad text-[13px]">{error}</p>}
      </div>
    </div>
  );
}
