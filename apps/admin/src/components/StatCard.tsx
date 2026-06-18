interface Props {
  label: string;
  value: number | string;
  accent?: 'default' | 'warning' | 'success' | 'danger';
}

const accentClass: Record<NonNullable<Props['accent']>, string> = {
  default: 'text-primary',
  warning: 'text-warning',
  success: 'text-success',
  danger: 'text-danger',
};

export function StatCard({ label, value, accent = 'default' }: Props) {
  const display = typeof value === 'number' ? value.toLocaleString('es-CO') : value;
  return (
    <div className="bg-white border border-border rounded-2xl p-6">
      <p className="text-xs uppercase tracking-widest text-secondary font-semibold">{label}</p>
      <p className={`mt-3 text-3xl font-bold ${accentClass[accent]}`}>{display}</p>
    </div>
  );
}
