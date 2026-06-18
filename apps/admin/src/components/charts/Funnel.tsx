interface Stage { label: string; count: number }

export function Funnel({ stages, lost }: { stages: Stage[]; lost: number }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  const first = stages[0]?.count ?? 0;

  return (
    <div className="space-y-2">
      {stages.map((s, idx) => {
        const width = `${Math.max(8, (s.count / max) * 100)}%`;
        const conv = idx === 0 || first === 0 ? 100 : Math.round((s.count / first) * 100);
        return (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-xs text-secondary w-40 truncate">{s.label}</span>
            <div className="flex-1 relative h-8 bg-surface rounded-md overflow-hidden">
              <div
                className="h-full bg-primary flex items-center px-3"
                style={{ width }}
              >
                <span className="text-white text-xs font-semibold">{s.count}</span>
              </div>
            </div>
            <span className="text-xs text-secondary w-12 text-right">{conv}%</span>
          </div>
        );
      })}
      {lost > 0 && (
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
          <span className="text-xs text-secondary w-40 truncate">Venta perdida</span>
          <div className="flex-1 relative h-6 bg-surface rounded-md overflow-hidden">
            <div className="h-full bg-danger flex items-center px-3" style={{ width: `${(lost / max) * 100}%` }}>
              <span className="text-white text-xs font-semibold">{lost}</span>
            </div>
          </div>
          <span className="text-xs w-12"></span>
        </div>
      )}
    </div>
  );
}
