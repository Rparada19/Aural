type Tone = 'neutral' | 'success' | 'warning' | 'alert';

const TONE_ATTR: Record<Tone, string | undefined> = {
  neutral: undefined,
  success: 'positive',
  warning: 'caution',
  alert: 'alert',
};

/** Cifra dura: número en serif, etiqueta pequeña arriba, regla de color
 *  que la califica sin recurrir a colorear el número entero. */
export function MetricCard({
  label, value, hint, tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="wsale-stat" data-tone={TONE_ATTR[tone]}>
      <p className="wsale-overline">{label}</p>
      <p className="wsale-figure text-[26px] mt-2 leading-none">{value}</p>
      {hint && <p className="text-[11px] text-[var(--ink-faint)] mt-2 leading-snug">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  emoji, title, description, action,
}: {
  emoji?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-[var(--rule-strong)] rounded-[3px] px-10 py-14 text-center">
      <p className="wsale-display text-[19px]">{title}</p>
      <p className="text-[13px] text-[var(--ink-soft)] mt-2.5 max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Barra de avance de una sola línea, sin bordes redondeados: se lee
 *  como una regla que se llena, no como una píldora de dashboard. */
export function Meter({ value, max, tone }: { value: number; max: number; tone?: Tone }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color =
    tone === 'success' ? 'var(--positive)'
    : tone === 'warning' ? 'var(--caution)'
    : tone === 'alert' ? 'var(--alert)'
    : 'var(--ink)';
  return (
    <div className="wsale-meter">
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/** Porcentaje de cumplimiento con punto de color: el color acompaña,
 *  no reemplaza al número. */
export function Pct({ actual, budget }: { actual: number; budget: number }) {
  if (budget <= 0) return <span className="text-[var(--ink-faint)]">—</span>;
  const ratio = actual / budget;
  const cls = ratio >= 1 ? 'wsale-good' : ratio >= 0.8 ? 'wsale-warn' : 'wsale-bad';
  const dot = ratio >= 1 ? 'wsale-dot-good' : ratio >= 0.8 ? 'wsale-dot-warn' : 'wsale-dot-bad';
  return (
    <span className={`${cls} font-medium whitespace-nowrap`}>
      <i className={`wsale-dot ${dot}`} />
      {Math.round(ratio * 100)}%
    </span>
  );
}
