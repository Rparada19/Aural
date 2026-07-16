import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AIConfigEditor } from '@/components/AIConfigEditor';
import { ReferenceDocsManager } from '@/components/ReferenceDocsManager';
import { CatalogSpecEditor } from '@/components/CatalogSpecEditor';
import type { GlossaryEntry } from '@/app/actions/reports';

export const dynamic = 'force-dynamic';

export default async function AITrainingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const [{ data: cfg }, { data: docs }, { data: gold }, { data: techs }, { data: plats }] = await Promise.all([
    supabase.from('ai_report_config')
      .select('system_prompt, glossary, banned_words, report_sections, updated_at')
      .eq('id', 1).single(),
    supabase.from('ai_reference_docs')
      .select('id, title, uploaded_at')
      .order('uploaded_at', { ascending: false }),
    supabase.from('medical_reports')
      .select('id, title, generated_at, created_at, patient_id, patient:patient_id (full_name, professional_id)')
      .eq('is_gold_example', true).is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('technologies').select('id, name, ai_spec').eq('is_active', true).order('sort_order'),
    supabase.from('platforms').select('id, code, ai_spec').eq('is_active', true).order('sort_order'),
  ]);

  const initial = {
    system_prompt: cfg?.system_prompt ?? '',
    glossary: Array.isArray(cfg?.glossary) ? (cfg!.glossary as GlossaryEntry[]) : [],
    banned_words: Array.isArray(cfg?.banned_words) ? (cfg!.banned_words as string[]) : [],
    report_sections: Array.isArray(cfg?.report_sections) ? (cfg!.report_sections as string[]) : [],
    updated_at: cfg?.updated_at ?? null,
  };

  return (
    <DashboardLayout userName={me.full_name ?? ''} isAdmin>
      <div>
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold">Configuración</p>
        <h1 className="text-3xl font-bold text-primary mt-1">Entrenamiento IA</h1>
        <p className="text-secondary text-sm mt-2 max-w-3xl">
          Todo lo que edites acá se inyecta en cada generación de informe. No re-entrena el modelo:
          lo <em>guía</em>. Menos texto suele ser mejor — mantén cada sección enfocada.
        </p>
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-border p-6">
        <AIConfigEditor initial={initial} />
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-border p-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-primary">Documentos de referencia (PDFs)</h2>
          <span className="text-xs text-secondary">
            Se adjuntan a cada generación. Máx 2 recomendado (cada PDF cuesta tokens).
          </span>
        </div>
        <ReferenceDocsManager
          docs={(docs ?? []).map((d) => ({ id: d.id, title: d.title, uploaded_at: d.uploaded_at }))}
        />
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-border p-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-primary">
            Descripciones del catálogo — Tecnologías
          </h2>
          <span className="text-xs text-secondary">
            Cómo la IA describe cada producto cuando aparece en un informe.
          </span>
        </div>
        <CatalogSpecEditor
          kind="technology"
          items={(techs ?? []).map((t) => ({ id: t.id, label: t.name, ai_spec: t.ai_spec }))}
        />
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-border p-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-primary">
            Descripciones del catálogo — Plataformas
          </h2>
          <span className="text-xs text-secondary">
            Características de cada plataforma para las Recomendaciones.
          </span>
        </div>
        <CatalogSpecEditor
          kind="platform"
          items={(plats ?? []).map((p) => ({ id: p.id, label: p.code, ai_spec: p.ai_spec }))}
        />
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-border p-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-primary">
            Ejemplos gold ({gold?.length ?? 0})
          </h2>
          <span className="text-xs text-secondary">
            Máximo 3 se envían como few-shot en la próxima generación.
          </span>
        </div>
        {!gold || gold.length === 0 ? (
          <p className="text-secondary text-sm">
            Ábrelo desde la ficha del paciente y usa "☆ Marcar como ejemplo gold".
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
                      <p className="font-semibold text-primary truncate">
                        ⭐ {g.title} — {patient?.full_name ?? '—'}
                      </p>
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
