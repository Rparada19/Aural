'use client';

export function Field({
  label, hint, children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">{label}</span>
      {children}
      {hint && <span className="block text-xs text-[var(--ink-soft)] mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'mt-1 w-full h-11 rounded-[2px] border border-[var(--rule)] bg-white px-3 outline-none focus:border-[var(--accent)] text-[var(--ink)]';
