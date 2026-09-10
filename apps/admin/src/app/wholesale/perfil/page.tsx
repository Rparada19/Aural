import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { WholesaleLayout, PageHead } from '@/components/WholesaleLayout';
import { ProfileForm, AssignmentPanel, type RepProfile } from '@/components/wholesale/ProfileForm';
import { requireWholesaleMe } from '@/lib/wholesale';
import { ROLE_LABEL } from '@/lib/wholesale-roles';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const me = await requireWholesaleMe();
  const supabase = await createSupabaseServerClient();

  // Coordinación y administración no tienen ficha de comercial: para
  // ellos el perfil es lo que pueden hacer, no una hoja de datos.
  if (!me.repId) {
    return (
      <WholesaleLayout userName={me.full_name} role={me.role}>
        <PageHead overline="Perfil" title={me.full_name} subtitle={ROLE_LABEL[me.role]} />
        <section className="wsale-panel p-6 max-w-2xl">
          <h2 className="wsale-display text-[17px] pb-3 border-b border-[var(--rule)]">
            Qué puedes hacer
          </h2>
          <ul className="mt-4 space-y-2.5 text-[13px]">
            {[
              [me.can.seeWholeChannel, 'Ver el canal completo, no solo una zona'],
              [me.can.manageClients, 'Crear clientes y asignarles comercial'],
              [me.can.setBudgets, 'Fijar presupuestos mensuales'],
              [me.can.setGoals, 'Definir objetivos y metas de actividad'],
              [me.can.manageReps, 'Crear y dar de baja comerciales'],
              [me.can.publishDocuments, 'Publicar documentos para el equipo'],
              [me.can.manageCatalogs, 'Administrar catálogos'],
              [me.can.manageAccess, 'Crear usuarios y dar acceso'],
            ].map(([allowed, label]) => (
              <li key={String(label)} className="flex items-baseline gap-2.5">
                <span className={allowed ? 'wsale-good' : 'text-[var(--ink-faint)]'}>
                  {allowed ? '✓' : '·'}
                </span>
                <span className={allowed ? '' : 'text-[var(--ink-faint)]'}>{label}</span>
              </li>
            ))}
          </ul>
        </section>
      </WholesaleLayout>
    );
  }

  const { data: rep } = await supabase
    .from('wholesale_reps')
    .select('id, name, zone, job_title, document_id, started_on, email, phone, mobile, city, bio, is_active')
    .eq('id', me.repId)
    .maybeSingle();

  if (!rep) {
    return (
      <WholesaleLayout userName={me.full_name} role={me.role}>
        <PageHead overline="Perfil" title={me.full_name} />
        <p className="text-[13px] text-[var(--ink-soft)]">
          Tu usuario está marcado como comercial pero no encuentro tu ficha. Avisa a coordinación.
        </p>
      </WholesaleLayout>
    );
  }

  return (
    <WholesaleLayout userName={me.full_name} role={me.role}>
      <PageHead
        overline={ROLE_LABEL[me.role]}
        title={rep.name}
        subtitle={[rep.job_title, rep.zone].filter(Boolean).join(' · ') || 'Sin zona asignada'}
        actions={
          <Link href={`/wholesale/reps/${rep.id}`} className="wsale-btn-ghost">
            Ver mi tablero
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] items-start">
        <ProfileForm rep={rep as RepProfile} />
        <AssignmentPanel rep={rep as RepProfile} />
      </div>
    </WholesaleLayout>
  );
}
