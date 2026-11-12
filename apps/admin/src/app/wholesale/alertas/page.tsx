import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { MetricCard, EmptyState } from '@/components/wholesale/MetricCard';
import { AlertList } from '@/components/wholesale/AlertList';
import { requireWholesaleMe } from '@/lib/wholesale';
import { buildAlerts, AREA_LABEL, type Area } from '@/lib/alerts';

export const dynamic = 'force-dynamic';

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ area?: string; ver?: string }> }) {
  const sp = await searchParams;
  const me = await requireWholesaleMe('alertas');
  const supabase = await createSupabaseServerClient();
  const all = await buildAlerts(supabase, me);

  const areas = [...new Set(all.map((a) => a.area))] as Area[];
  let list = sp.area ? all.filter((a) => a.area === sp.area) : all;
  if (sp.ver !== 'todo') list = list.filter((a) => a.sev !== 'info' || sp.area);
  const count = (s: string) => all.filter((a) => a.sev === s).length;
  const href = (area?: string, ver?: string) => {
    const p = new URLSearchParams();
    if (area) p.set('area', area);
    if (ver) p.set('ver', ver);
    const q = p.toString();
    return `/wholesale/alertas${q ? `?${q}` : ''}`;
  };

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline="Wholesale · Alertas"
        title="Lo que hay que atender"
        subtitle="Señales que salen solas de préstamos, casos, clientes, oportunidades, presupuesto y equipo. Primero lo urgente; cada una lleva a donde se resuelve."
      />

      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCard label="Urgentes" value={String(count('alta'))} tone={count('alta') ? 'alert' : 'success'} />
        <MetricCard label="Para atender" value={String(count('media'))} tone={count('media') ? 'warning' : 'neutral'} />
        <MetricCard label="Para tener en cuenta" value={String(count('info'))} />
        <MetricCard label="Buenas noticias" value={String(count('logro'))} tone={count('logro') ? 'success' : 'neutral'} />
      </section>

      <div className="flex flex-wrap gap-2 mb-5">
        <Link href={href(undefined, sp.ver)} className="wsale-chip" data-on={!sp.area}>Todas · {all.length}</Link>
        {areas.map((a) => (
          <Link key={a} href={href(a, sp.ver)} className="wsale-chip" data-on={sp.area === a}>{AREA_LABEL[a]} · {all.filter((x) => x.area === a).length}</Link>
        ))}
        {!sp.area && count('info') > 0 && (
          <Link href={href(undefined, sp.ver === 'todo' ? undefined : 'todo')} className="text-[12px] text-[var(--accent)] ml-2 self-center">
            {sp.ver === 'todo' ? 'Ocultar lo informativo' : 'Ver también lo informativo'}
          </Link>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState title="Todo al día" description="No hay nada pendiente por ahora. Las alertas aparecen solas cuando algo se vence, se enfría o necesita atención." />
      ) : (
        <AlertList alerts={list} />
      )}
    </WholesaleLayout>
  );
}
