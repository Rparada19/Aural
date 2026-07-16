import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ReportActions } from '@/components/ReportActions';
import { ReportBodyEditor } from '@/components/ReportBodyEditor';

export const dynamic = 'force-dynamic';

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string; patientId: string; reportId: string }>;
}) {
  const { id, patientId, reportId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const { data: report } = await supabase
    .from('medical_reports')
    .select('id, title, ai_body, otoscopy_description, audiometry_url, logoaudiometry_url, generated_at, created_at, patient_id, author_id')
    .eq('id', reportId)
    .is('deleted_at', null)
    .single();

  if (!report || report.patient_id !== patientId) notFound();

  const { data: patient } = await supabase
    .from('patients').select('full_name, cedula').eq('id', patientId).single();

  async function sign(path: string | null) {
    if (!path) return null;
    const { data } = await supabase.storage.from('medical-exams').createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
  }
  const [audioUrl, logoUrl] = await Promise.all([sign(report.audiometry_url), sign(report.logoaudiometry_url)]);

  const hasBody = !!(report.ai_body && report.ai_body.trim().length > 0);
  const canEdit = report.author_id === user.id;

  return (
    <DashboardLayout userName={me.full_name}>
      <Link href={`/users/${id}/patients/${patientId}`} className="text-sm text-secondary hover:text-primary">
        ← {patient?.full_name ?? 'Paciente'}
      </Link>

      <div className="mt-4 flex items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary font-semibold">Informe médico</p>
          <h1 className="text-3xl font-bold text-primary mt-1">{report.title}</h1>
          <p className="text-secondary text-sm mt-1">
            {patient?.full_name} · CC {patient?.cedula} ·{' '}
            {new Date(report.generated_at ?? report.created_at).toLocaleString('es-CO')}
          </p>
        </div>
        {!hasBody && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-warning/15 text-warning border border-warning/30">
            Borrador sin cuerpo
          </span>
        )}
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-border p-6">
        <ReportBodyEditor
          reportId={report.id}
          professionalId={id}
          patientId={patientId}
          initialBody={report.ai_body ?? ''}
          canEdit={canEdit}
        />
      </div>

      <div className="mt-6">
        <ReportActions
          reportId={report.id}
          professionalId={id}
          patientId={patientId}
          hasBody={hasBody}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Audiometría</p>
          {audioUrl ? (
            <a href={audioUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={audioUrl} alt="Audiometría" className="w-full rounded-md border border-border" />
            </a>
          ) : (
            <p className="text-secondary text-sm">Sin imagen.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Logoaudiometría</p>
          {logoUrl ? (
            <a href={logoUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Logoaudiometría" className="w-full rounded-md border border-border" />
            </a>
          ) : (
            <p className="text-secondary text-sm">Sin imagen.</p>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Otoscopia (texto del operador)</p>
        <p className="text-foreground text-sm whitespace-pre-wrap">
          {report.otoscopy_description || <span className="text-secondary">No registrada.</span>}
        </p>
      </div>
    </DashboardLayout>
  );
}
