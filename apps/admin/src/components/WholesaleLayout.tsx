import Link from 'next/link';
import Image from 'next/image';
import { LogoutButton } from './LogoutButton';
import { MARKET_URL } from '@/lib/markets';

export type WholesaleRole = 'coordinator' | 'rep';

const NAV: { href: string; label: string; icon: string; allowed: WholesaleRole[] }[] = [
  { href: '/wholesale', label: 'Resumen', icon: '📊', allowed: ['coordinator', 'rep'] },
  { href: '/wholesale/clients', label: 'Clientes', icon: '🏥', allowed: ['coordinator', 'rep'] },
  { href: '/wholesale/sales', label: 'Ventas', icon: '💳', allowed: ['coordinator', 'rep'] },
  { href: '/wholesale/reps', label: 'Comerciales', icon: '🧭', allowed: ['coordinator'] },
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
    <div className="min-h-screen flex">
      <aside className="w-64 bg-primary text-white p-6 flex flex-col">
        <div className="mb-6 bg-white rounded-xl p-4 -mx-2">
          <Image src="/logo.png" alt="Aural" width={180} height={56} className="w-full h-auto" />
          <p className="text-xs uppercase tracking-widest text-secondary mt-2 text-center font-semibold">
            Wholesale
          </p>
        </div>

        <nav className="flex-1 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition text-sm"
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="text-xs opacity-70 border-t border-white/10 pt-4 space-y-1">
          <p className="truncate">{userName}</p>
          <p className="capitalize opacity-70">
            {role === 'coordinator' ? 'Coordinación' : 'Comercial'}
          </p>
          <a href={MARKET_URL.vm} className="block underline opacity-80 hover:opacity-100">
            Ir a Visita médica
          </a>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 bg-surface p-10 overflow-y-auto">{children}</main>
    </div>
  );
}
