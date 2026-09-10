import { redirect } from 'next/navigation';
import Image from 'next/image';
import { getAdminMe, hasAccess } from '@/lib/auth';
import { MARKET_URL } from '@/lib/markets';
import { LogoutButton } from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

const MARKETS = [
  {
    key: 'vm' as const,
    name: 'Visita médica',
    description: 'Médicos, remisiones, pacientes, informes y comisiones.',
  },
  {
    key: 'wholesale' as const,
    name: 'Wholesale',
    description: 'Distribuidores regionales, catálogo y pedidos.',
  },
];

export default async function HubPage() {
  const me = await getAdminMe();
  if (!hasAccess(me)) redirect('/login');

  return (
    <main className="min-h-screen grid place-items-center bg-surface px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          <Image src="/logo.png" alt="Aural" width={260} height={80} className="mx-auto h-auto" priority />
          <p className="text-secondary text-xs uppercase tracking-widest font-semibold mt-4">
            Selecciona un mercado
          </p>
          <p className="text-foreground mt-2">Hola, {me!.full_name}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {MARKETS.map((market) => (
            <a
              key={market.key}
              href={MARKET_URL[market.key]}
              className="block bg-white rounded-2xl border border-border p-6 shadow-sm hover:border-primary transition"
            >
              <h2 className="text-lg font-semibold text-foreground">{market.name}</h2>
              <p className="text-secondary text-sm mt-2">{market.description}</p>
            </a>
          ))}
        </div>

        <div className="mt-8 text-center">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
