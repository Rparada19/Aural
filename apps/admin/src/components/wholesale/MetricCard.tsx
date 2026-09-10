export function MetricCard({
  label, value, hint, tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  const accent =
    tone === 'success' ? 'text-success'
    : tone === 'warning' ? 'text-warning'
    : 'text-foreground';
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-secondary">{label}</p>
      <p className={`text-2xl font-semibold mt-2 ${accent}`}>{value}</p>
      {hint && <p className="text-xs text-secondary mt-1">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  emoji, title, description, action,
}: {
  emoji: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-border p-12 text-center">
      <p className="text-4xl" aria-hidden>{emoji}</p>
      <h2 className="text-lg font-semibold mt-4">{title}</h2>
      <p className="text-secondary text-sm mt-2 max-w-md mx-auto">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
