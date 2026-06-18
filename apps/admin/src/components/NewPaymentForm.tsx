'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { registerPayment, uploadReceipt } from '@/app/actions/payments';

interface Pro { id: string; label: string; pending: number }

const CHANNELS = ['Transferencia', 'PSE', 'Nequi', 'Daviplata', 'Consignación', 'Otro'] as const;

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function NewPaymentForm({ professionals, preselected }: { professionals: Pro[]; preselected?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [proId, setProId] = useState(preselected ?? '');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [channel, setChannel] = useState<string>('Transferencia');
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ commissionsPaid: number; leftover: number } | null>(null);

  const pro = professionals.find((p) => p.id === proId);

  function onSubmit() {
    setError(null);
    setResult(null);
    if (!proId) { setError('Selecciona un profesional.'); return; }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) { setError('Valor inválido.'); return; }

    startTransition(async () => {
      try {
        let attachmentPath: string | null = null;
        if (file) {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('professional_id', proId);
          attachmentPath = await uploadReceipt(fd);
        }
        const r = await registerPayment({
          professional_id: proId,
          amount: amt,
          paid_at: new Date(paidAt).toISOString(),
          channel,
          transaction_ref: ref || null,
          notes: notes || null,
          attachment_url: attachmentPath,
        });
        setResult({ commissionsPaid: r.commissionsPaid, leftover: r.leftover });
        setTimeout(() => {
          router.push('/payments');
          router.refresh();
        }, 1500);
      } catch (e: any) {
        setError(e?.message ?? 'No se pudo registrar el pago.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Profesional *</span>
        <select
          value={proId}
          onChange={(e) => setProId(e.target.value)}
          className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
        >
          <option value="">Selecciona…</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} — Pendiente: {cop(p.pending)}
            </option>
          ))}
        </select>
        {pro && (
          <p className="text-xs text-secondary mt-1">Saldo pendiente actual: <strong>{cop(pro.pending)}</strong></p>
        )}
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Valor pagado *</span>
          <input
            value={amount} onChange={(e) => setAmount(e.target.value)}
            type="number" min="0" step="1"
            className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Fecha *</span>
          <input
            value={paidAt} onChange={(e) => setPaidAt(e.target.value)}
            type="date"
            className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Canal *</span>
          <select
            value={channel} onChange={(e) => setChannel(e.target.value)}
            className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
          >
            {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Número de transacción</span>
          <input
            value={ref} onChange={(e) => setRef(e.target.value)}
            className="mt-1 w-full h-11 rounded-md border border-border bg-surface px-3 outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Observaciones</span>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Comprobante (PDF o imagen)</span>
        <div className="mt-1 border-2 border-dashed border-border rounded-md p-3 bg-surface">
          <input
            type="file" accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:px-3 file:py-1.5 file:border-0 file:bg-primary file:text-white file:font-semibold file:text-xs file:rounded"
          />
          {file && <p className="text-xs text-secondary mt-2">{file.name}</p>}
        </div>
      </label>

      {error && <p className="text-danger text-sm bg-danger/10 rounded-md px-3 py-2">{error}</p>}
      {result && (
        <p className="text-success text-sm bg-success/10 rounded-md px-3 py-2">
          Pago registrado. {result.commissionsPaid} comisión(es) marcadas como pagadas.
          {result.leftover > 0.01 ? ` Excedente sin asignar: ${cop(result.leftover)}.` : ''}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onSubmit}
          disabled={isPending}
          className="px-5 h-11 rounded-md bg-primary text-white font-semibold hover:bg-primary-soft disabled:opacity-50"
        >
          {isPending ? 'Registrando…' : 'Registrar pago'}
        </button>
      </div>
    </div>
  );
}
