import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CampaignActions } from '@/components/CampaignActions';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, { c: string; l: string }> = {
  draft: { c: 'bg-border text-secondary', l: 'Borrador' },
  scheduled: { c: 'bg-warning/15 text-warning', l: 'Programada' },
  sent: { c: 'bg-success/15 text-success', l: 'Enviada' },
  cancelled: { c: 'bg-secondary/15 text-secondary', l: 'Cancelada' },
};
const CHANNEL: Record<string, string> = { push: 'Push', email: 'Email', inapp: 'In-App' };

export default async function MarketingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <DashboardLayout userName={me.full_name}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Marketing</h1>
          <p className="text-secondary mt-1">Campañas hacia tus médicos.</p>
        </div>
        <Link href="/marketing/new" className="px-4 h-11 rounded-md bg-primary text-white font-semibold inline-flex items-center hover:bg-primary-soft">
          + Nueva campaña
        </Link>
      </div>

      <div className="bg-white border border-border rounded-2xl overflow-hidden mt-8">
        <table className="w-full text-sm">
          <thead className="bg-surface text-secondary text-xs uppercase tracking-wider">
            <tr>
              <Th>Título</Th>
              <Th>Canal</Th>
              <Th>Estado</Th>
              <Th>Audiencia</Th>
              <Th>Fecha</Th>
              <Th className="text-right pr-6">Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(campaigns ?? []).map((c: any) => {
              const audience = [
                c.audience_roles?.length ? `${c.audience_roles.length} rol(es)` : null,
                c.audience_cities?.length ? `${c.audience_cities.length} ciudad(es)` : null,
                c.audience_visitor_id ? 'Visitador' : null,
              ].filter(Boolean).join(' · ') || 'Todos';
              const s = STATUS[c.status] ?? { c: 'bg-border', l: c.status };
              return (
                <tr key={c.id} className="hover:bg-surface/60">
                  <Td className="font-medium text-primary">{c.title}</Td>
                  <Td>{CHANNEL[c.channel] ?? c.channel}</Td>
                  <Td><span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${s.c}`}>{s.l}</span></Td>
                  <Td className="text-xs">{audience}</Td>
                  <Td className="text-xs">
                    {c.sent_at ? `Enviada ${new Date(c.sent_at).toLocaleDateString('es-CO')}`
                      : c.scheduled_at ? `Para ${new Date(c.scheduled_at).toLocaleDateString('es-CO')}`
                      : new Date(c.created_at).toLocaleDateString('es-CO')}
                  </Td>
                  <Td className="text-right pr-6">
                    <CampaignActions id={c.id} status={c.status} />
                  </Td>
                </tr>
              );
            })}
            {(campaigns ?? []).length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-secondary">Sin campañas. Crea la primera.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left font-semibold px-6 py-3 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-4 text-foreground ${className}`}>{children}</td>;
}
