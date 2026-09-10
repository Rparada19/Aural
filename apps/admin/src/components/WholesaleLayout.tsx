import Link from 'next/link';
import Image from 'next/image';
import { LogoutButton } from './LogoutButton';
import { MARKET_URL } from '@/lib/markets';
import { ROLE_LABEL } from '@/lib/wholesale-roles';

import type { WholesaleRole } from '@/lib/wholesale-roles';
export type { WholesaleRole };

const NAV: { href: string; label: string; num: string; allowed: WholesaleRole[] }[] = [
  { href: '/wholesale', label: 'Resumen', num: '01', allowed: ['admin', 'coordinator', 'rep'] },
  { href: '/wholesale/clients', label: 'Clientes', num: '02', allowed: ['admin', 'coordinator', 'rep'] },
  { href: '/wholesale/sales', label: 'Ventas', num: '03', allowed: ['admin', 'coordinator', 'rep'] },
  { href: '/wholesale/budgets', label: 'Presupuestos', num: '04', allowed: ['admin', 'coordinator', 'rep'] },
  { href: '/wholesale/proyectos', label: 'Proyectos', num: '05', allowed: ['admin', 'coordinator', 'rep'] },
  { href: '/wholesale/documentos', label: 'Documentos', num: '06', allowed: ['admin', 'coordinator', 'rep'] },
  { href: '/wholesale/reps', label: 'Comerciales', num: '07', allowed: ['admin', 'coordinator'] },
];

export function WholesaleLayout({
  userName, role, children,
}: {
  userName: string;
  role: WholesaleRole;
  children: React.ReactNode;
}) {
  const items = NAV.filter((n) => n.allowed.includes(role));

  return (
    <div className="wsale min-h-screen flex">
      <aside className="wsale-nav w-56 shrink-0 flex flex-col">
        <div className="px-6 pt-7 pb-7">
          <Image
            src="/logo-aural-marca-blanco.png"
            alt="Aural"
            width={4191}
            height={915}
            priority
            className="w-[104px] h-auto"
          />
          <p className="mt-3 text-[9.5px] font-medium tracking-[0.24em] uppercase text-white/40">
            Wholesale
          </p>
        </div>

        <nav className="flex-1 px-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-baseline gap-3 px-3 py-2.5 text-[13px] transition"
            >
              <span className="wsale-mono text-[10px] text-white/30 group-hover:text-white/60 transition">
                {item.num}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="px-6 py-5 border-t border-white/10">
          <Link href="/wholesale/perfil" className="text-[13px] text-white/85 truncate block hover:text-white transition">
            {userName}
          </Link>
          <p className="text-[11px] text-white/40 mt-0.5">{ROLE_LABEL[role]}</p>
          <div className="mt-3 flex flex-col gap-1.5 text-[11px]">
            <a href={MARKET_URL.vm} className="text-white/50 hover:text-white transition">
              Visita médica →
            </a>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-10 py-9">{children}</div>
      </main>
    </div>
  );
}

/** Cabecera editorial: overline, título en serif y una regla que cierra. */
export function PageHead({
  overline, title, subtitle, actions,
}: {
  overline?: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-7 pb-5 border-b border-[var(--rule-strong)]">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          {overline && <p className="wsale-overline mb-2">{overline}</p>}
          <h1 className="wsale-display text-[30px] leading-[1.1]">{title}</h1>
          {subtitle && (
            <p className="text-[13px] text-[var(--ink-soft)] mt-2 max-w-2xl">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
