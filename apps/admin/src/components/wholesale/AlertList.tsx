import Link from 'next/link';
import { AREA_LABEL, type Alert } from '@/lib/alerts';

const BAR: Record<string, string> = {
  alta: 'border-l-[var(--alert)]', media: 'border-l-[var(--caution)]', info: 'border-l-[var(--rule-strong,#c9c2b3)]', logro: 'border-l-[var(--positive)]',
};
const TAG: Record<string, string> = { alta: 'Urgente', media: 'Atender', info: 'Para tener en cuenta', logro: 'Buena noticia' };
const TAG_CLASS: Record<string, string> = { alta: 'wsale-bad', media: 'wsale-warn', info: 'text-[var(--ink-faint)]', logro: 'wsale-good' };

export function AlertList({ alerts, compact = false }: { alerts: Alert[]; compact?: boolean }) {
  return (
    <ul className="space-y-2">
      {alerts.map((a) => (
        <li key={a.id}>
          <Link href={a.href} className={`block wsale-panel border-l-4 ${BAR[a.sev]} px-4 ${compact ? 'py-2.5' : 'py-3'} hover:bg-[rgba(180,85,31,0.03)] transition`}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[14px] leading-snug">{a.title}</p>
              <span className={`text-[10px] uppercase tracking-wider whitespace-nowrap ${TAG_CLASS[a.sev]}`}>{TAG[a.sev]}</span>
            </div>
            <p className="text-[12px] text-[var(--ink-soft)] mt-0.5">
              {AREA_LABEL[a.area]} · {a.detail}{a.who ? ` · ${a.who}` : ''}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
