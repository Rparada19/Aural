'use client';

export function PrintButton({ label = 'Descargar PDF' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="no-print h-11 px-5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-soft transition"
    >
      {label}
    </button>
  );
}
