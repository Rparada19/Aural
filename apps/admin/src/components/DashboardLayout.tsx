import Link from 'next/link';
import Image from 'next/image';
import { LogoutButton } from './LogoutButton';

export type AdminRoleLite = 'coordinator' | 'csr' | 'visitor_rep' | null;

interface NavItem { href: string; label: string; allowed: AdminRoleLite[]; coordinatorOnly?: boolean }

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', allowed: ['coordinator', 'csr', 'visitor_rep'] },
  { href: '/analytics', label: 'Analytics', allowed: ['coordinator'] },
  { href: '/users', label: 'Profesionales', allowed: ['coordinator', 'csr', 'visitor_rep'] },
  { href: '/visitors', label: 'Visitadores', allowed: ['coordinator'] },
  { href: '/patients', label: 'Pacientes', allowed: ['coordinator', 'csr', 'visitor_rep'] },
  { href: '/payments', label: 'Pagos', allowed: ['coordinator'] },
  { href: '/news', label: 'Noticias', allowed: ['coordinator'] },
  { href: '/marketing', label: 'Marketing', allowed: ['coordinator'] },
  { href: '/catalogs', label: 'Catálogos', allowed: ['coordinator'] },
  { href: '/staff', label: 'Equipo Aural', allowed: ['coordinator'] },
];

const ROLE_LABEL: Record<NonNullable<AdminRoleLite>, string> = {
  coordinator: 'Coordinador',
  csr: 'Servicio al cliente',
  visitor_rep: 'Visitador',
};

export function DashboardLayout({
  userName, role, isAdmin, children,
}: {
  userName: string;
  role?: AdminRoleLite;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  // Si no se pasa role/isAdmin (compatibilidad con páginas viejas), mostramos todo como coordinador
  const effectiveRole: AdminRoleLite =
    isAdmin === true ? 'coordinator' :
    role !== undefined ? role :
    'coordinator';
  const items = NAV.filter((n) => effectiveRole && n.allowed.includes(effectiveRole));
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-primary text-white p-6 flex flex-col">
        <div className="mb-6 bg-white rounded-xl p-4 -mx-2">
          <Image src="/logo.png" alt="Aural" width={180} height={56} className="w-full h-auto" />
          <p className="text-xs uppercase tracking-widest text-secondary mt-2 text-center font-semibold">
            {effectiveRole ? ROLE_LABEL[effectiveRole] : 'Admin'}
          </p>
        </div>
        <nav className="flex-1 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded-md hover:bg-white/10 transition text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="text-xs opacity-70 border-t border-white/10 pt-4">
          <p className="truncate">{userName}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 bg-surface p-10 overflow-y-auto">{children}</main>
    </div>
  );
}
