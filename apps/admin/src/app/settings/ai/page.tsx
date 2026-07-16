import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AIPromptEditor } from '@/components/AIPromptEditor';

export const dynamic = 'force-dynamic';

export default async function AITrainingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const { data: cfg } = await supabase
    .from('ai_report_config').select('system_prompt, updated_at').eq('id', 1).single();

  const { data: gold } = await supabase
    .from('medical_reports')
    .select(`id, title, generated_at, created_at, patient_id,
      patient:patient_id (full_name, professional_id)`)
    .eq('is_gold_example', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return (
    <DashboardLayout userName={me.full_name ?? ''} isAdmin>
      <div>
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold">Configuración</p>
        <h1 className="text-3xl font-bold text-primary mt-1">Entrenamiento IA</h1>
        <p className="text-secondary text-sm mt-2 max-w-3xl">
          La IA no se re-entrena. Lo que sí puedes hacer es (a) editar las instrucciones base que la
          guían en cada generación y (b) marcar informes ya generados como "ejemplo gold" para que
          los use como referencia de estilo en los próximos.
        </p>
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-border p-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-primary">Instrucciones base (system prompt)</h2>
          <span className="text-xs text-secondary">Se inyectan en cada generación.</span>
        </div>
        <AIPromptEditor
          initialPrompt={cfg?.system_prompt ?? ''}
          updatedAt={cfg?.updated_at ?? null}
        />
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-border p-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-primary">
            Ejemplos gold ({gold?.length ?? 0})
          </h2>
          <span className="text-xs text-secondary">
            Se envían como few-shot (máximo 3) en la próxima generación.
          </span>
        </div>
        {!gold || gold.length === 0 ? (
          <p className="text-secondary text-sm">
            Aún no has marcado ningún informe como ejemplo. Ábrelo desde la ficha del paciente y
            usa el botón "Marcar como ejemplo gold".
          </p>
        ) : (
          <ul className="space-y-2">
            {gold.map((g) => {
              const patient = g.patient as any;
              return (
                <li key={g.id}>
                  <Link
                    href={`/users/${patient?.professional_id ?? ''}/patients/${g.patient_id}/reports/${g.id}`}
                    className="block bg-surface/60 hover:bg-surface border border-border rounded-lg p-3 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-primary truncate">
                          ⭐ {g.title} — {patient?.full_name ?? '—'}
                        </p>
                      </div>
                      <span className="text-xs text-secondary whitespace-nowrap">
                        {new Date(g.generated_at ?? g.created_at).toLocaleString('es-CO')}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
