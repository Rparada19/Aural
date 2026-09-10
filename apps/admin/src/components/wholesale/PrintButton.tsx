'use client';

export function PrintButton({ label = 'Descargar PDF' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print h-11 px-5 rounded-[2px] bg-[var(--ink)] text-white font-semibold hover:opacity-90 transition"
    >
      {label}
    </button>
  );
}
