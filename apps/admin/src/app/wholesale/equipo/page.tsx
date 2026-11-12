import { redirect } from 'next/navigation';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { MetricCard, Meter, EmptyState } from '@/components/wholesale/MetricCard';
import { requireWholesaleMe } from '@/lib/wholesale';
import { serviceTeam, SERVICIO_URL, type ServicePerson } from '@/lib/servicio';

export const dynamic = 'force-dynamic';

const AREA: Record<string, string> = {
  wholesale: 'Especialistas wholesale', audiologico: 'Servicio al cliente audiológico', lideres: 'Líderes',
  audiologia: 'Audiología', recepcion: 'Recepción', call_center: 'Call center', visitadores: 'Visita médica',
};
const ORDER = ['lideres', 'wholesale', 'audiologico', 'audiologia', 'recepcion', 'call_center', 'visitadores'];
const SEV_CLASS: Record<string, string> = { alta: 'wsale-bad', media: 'wsale-warn', info: 'text-[var(--ink-soft)]', logro: 'wsale-good' };

const f1 = (n: number | null) => (n == null ? '—' : n.toFixed(1));

function Person({ p }: { p: ServicePerson }) {
  const trend = p.voz.mes != null && p.voz.mes_anterior != null ? p.voz.mes - p.voz.mes_anterior : null;
  const top = p.alarmas.filter((a) => a.sev !== 'info').slice(0, 3);
  return (
    <div className="wsale-panel p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] leading-snug">{p.name}</p>
          <p className="text-[11px] text-[var(--ink-faint)]">{[p.cargo, p.sede].filter(Boolean).join(' · ') || AREA[p.area] || p.area}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="wsale-figure text-[22px] leading-none">{f1(p.voz.mes)}</p>
          <p className={`text-[10px] mt-1 ${trend == null ? 'text-[var(--ink-faint)]' : trend >= 0 ? 'wsale-good' : 'wsale-bad'}`}>
            {trend == null ? 'QR del mes' : `${trend >= 0 ? '▲' : '▼'} ${Math.abs(trend).toFixed(1)} vs mes anterior`}
          </p>
        </div>
      </div>

      {p.voz.meta ? (
        <div>
          <Meter value={p.voz.n_mes} max={p.voz.meta} tone={p.voz.n_mes >= p.voz.meta ? 'success' : 'neutral'} />
          <p className="text-[10px] text-[var(--ink-faint)] mt-1">{p.voz.n_mes} de {p.voz.meta} calificaciones QR este mes · histórico {f1(p.voz.total)}</p>
        </div>
      ) : (
        <p className="text-[10px] text-[var(--ink-faint)]">{p.voz.n_mes} calificaciones QR este mes · sin meta asignada</p>
      )}

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div><p className="wsale-overline">Academia</p><p className={p.academia.aprobado ? 'wsale-good' : p.academia.modulo ? 'wsale-warn' : 'text-[var(--ink-faint)]'}>{p.academia.aprobado ? `Aprobó${p.academia.mejor ? ` ${p.academia.mejor}%` : ''}` : p.academia.modulo ? `Pendiente (${p.academia.intentos}/2)` : 'Sin módulo'}</p></div>
        <div><p className="wsale-overline">Uno a uno</p><p className={p.uno_a_uno ? 'wsale-good' : 'text-[var(--ink-soft)]'}>{p.uno_a_uno ? p.uno_a_uno.slice(0, 10) : 'Pendiente'}</p></div>
        <div><p className="wsale-overline">Evaluación</p><p>{p.evaluacion.puntaje != null ? `${p.evaluacion.puntaje}/100` : p.evaluacion.estado ?? '—'}</p></div>
      </div>

      {top.length > 0 && (
        <ul className="space-y-0.5 border-t border-[var(--rule)] pt-2">
          {top.map((a) => <li key={a.t} className={`text-[11px] ${SEV_CLASS[a.sev]}`}>{a.t}</li>)}
        </ul>
      )}
      <a href={p.ficha} target="_blank" rel="noreferrer" className="text-[11px] text-[var(--accent)] mt-auto">Ver ficha completa en servicio →</a>
    </div>
  );
}

export default async function TeamPage() {
  const me = await requireWholesaleMe('equipo');
  if (!me.isCoordination) redirect('/wholesale');
  const res = await serviceTeam();

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline="Wholesale · Equipo"
        title="Equipo y servicio"
        subtitle="Calificación QR de quienes atendemos, Academia, uno a uno y alarmas de cada persona del equipo de Margarita. Los datos vienen del programa de servicio."
        actions={<a href={`${SERVICIO_URL}/lider`} target="_blank" rel="noreferrer" className="wsale-btn-ghost">Abrir portal de servicio</a>}
      />

      {!res.ok ? (
        <EmptyState title="No se pudo traer el equipo" description={res.reason} />
      ) : (() => {
        const team = res.team;
        const rated = team.filter((p) => p.voz.mes != null);
        const avg = rated.length ? rated.reduce((a, p) => a + (p.voz.mes ?? 0), 0) / rated.length : null;
        const withMeta = team.filter((p) => p.voz.meta);
        const metaDone = withMeta.filter((p) => p.voz.n_mes >= (p.voz.meta ?? 0)).length;
        const withModule = team.filter((p) => p.academia.modulo);
        const passed = withModule.filter((p) => p.academia.aprobado).length;
        const ones = team.filter((p) => !p.self && p.uno_a_uno).length;
        const urgent = team.reduce((a, p) => a + p.alarmas.filter((x) => x.sev === 'alta').length, 0);
        const areas = [...new Set(team.map((p) => p.area))].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
        return (
          <>
            <section className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-8">
              <MetricCard label="QR promedio del mes" value={f1(avg)} hint={`${rated.length} de ${team.length} personas calificadas`} tone={avg == null ? 'neutral' : avg >= 4.5 ? 'success' : avg >= 4 ? 'warning' : 'alert'} />
              <MetricCard label="Meta QR cumplida" value={`${metaDone} de ${withMeta.length}`} hint="Personas con su meta mensual al día" />
              <MetricCard label="Academia aprobada" value={withModule.length ? `${passed} de ${withModule.length}` : '—'} hint="Módulo del mes" />
              <MetricCard label="Uno a uno del mes" value={`${ones} de ${team.filter((p) => !p.self).length}`} />
              <MetricCard label="Alarmas urgentes" value={String(urgent)} tone={urgent ? 'alert' : 'success'} />
            </section>
            {areas.map((a) => (
              <section key={a} className="mb-8">
                <p className="wsale-overline mb-3">{AREA[a] ?? a} · {team.filter((p) => p.area === a).length}</p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {team.filter((p) => p.area === a).map((p) => <Person key={p.id} p={p} />)}
                </div>
              </section>
            ))}
          </>
        );
      })()}
    </WholesaleLayout>
  );
}
