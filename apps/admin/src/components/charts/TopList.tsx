interface Row { name: string; count: number; amountFormatted: string; amountRaw: number }

export function TopList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="text-secondary text-sm">Sin ventas registradas.</p>;
  }
  const max = Math.max(1, ...rows.map((r) => r.amountRaw));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.name} className="flex items-center gap-3">
          <span className="text-sm text-foreground w-32 truncate">{r.name}</span>
          <div className="flex-1 h-6 bg-surface rounded-md overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${(r.amountRaw / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-secondary w-16 text-right">{r.count} v.</span>
          <span className="text-xs text-primary font-semibold w-24 text-right">{r.amountFormatted}</span>
        </li>
      ))}
    </ul>
  );
}
