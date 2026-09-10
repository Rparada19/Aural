import { redirect } from 'next/navigation';
import Image from 'next/image';
import { getAdminMe, hasAccess } from '@/lib/auth';
import { MARKET_URL } from '@/lib/markets';
import { LogoutButton } from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function WholesalePage() {
  const me = await getAdminMe();
  if (!hasAccess(me)) redirect('/login');

  return (
    <main className="min-h-screen grid place-items-center bg-surface px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <Image src="/logo.png" alt="Aural" width={260} height={80} className="mx-auto h-auto" priority />
        <p className="text-secondary text-xs uppercase tracking-widest font-semibold mt-4">Wholesale</p>
        <h1 className="text-2xl font-semibold text-foreground mt-6">Distribuidores regionales</h1>
        <p className="text-secondary mt-3">
          Este mercado está en construcción. Aquí vivirán el catálogo mayorista, los pedidos y el
          estado de cuenta de cada distribuidor.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <a href={MARKET_URL.vm} className="text-primary font-semibold hover:underline">
            Ir a Visita médica
          </a>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
