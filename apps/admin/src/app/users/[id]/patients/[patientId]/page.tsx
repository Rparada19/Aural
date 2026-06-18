import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ReportComposer } from '@/components/ReportComposer';
import { CommercialEditor } from '@/components/CommercialEditor';
import { ClinicalEditor } from '@/components/ClinicalEditor';
import { NoteAdder } from '@/components/NoteAdder';
import { GeneralInfoEditor } from '@/components/GeneralInfoEditor';
import { FUNNEL_STATUS_LABEL, type PatientFunnelStatus, CASE_TYPE_LABEL, type PatientCaseType } from '@aural/shared';

export const dynamic = 'force-dynamic';

const cop = (n: number) =>
  n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default async function PatientDetailAdminPage({
  params,
}: {
  params: Promise<{ id: string; patientId: string }>;
}) {
  const { id, patientId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await supabase
    .from('profiles').select('is_admin, full_name').eq('id', user.id).single();
  if (!me?.is_admin) redirect('/login');

  const [{ data: patient }, { data: pro }, { data: notes }, { data: followups }, { data: commissions }, { data: reports }] = await Promise.all([
    supabase
      .from('patients')
      .select(`*,
        city:city_id (name),
        technology:technology_id (name),
        platform:platform_id (code),
        location:location_id (name),
        visitor:visitor_id (name),
        audiologist:audiologist_id (name)
      `)
      .eq('id', patientId)
      .single(),
    supabase.from('profiles').select('full_name').eq('id', id).single(),
    supabase.from('patient_notes').select('id, body, created_at, author_id').eq('patient_id', patientId).order('created_at', { ascending: false }),
    supabase.from('patient_followups').select('id, comment, next_action, next_action_at, created_at, author_id').eq('patient_id', patientId).order('created_at', { ascending: false }),
    supabase.from('commissions').select('amount, status, generated_at, paid_at').eq('patient_id', patientId),
    supabase.from('medical_reports').select('id, title, generated_at, created_at, ai_body').eq('patient_id', patientId).is('deleted_at', null).order('created_at', { ascending: false }),
  ]);

  const [{ data: techs }, { data: plats }, { data: locs }, { data: visitorsCat }, { data: audioCat }] = await Promise.all([
    supabase.from('technologies').select('id, name').eq('is_active', true).order('sort_order'),
    supabase.from('platforms').select('id, code').eq('is_active', true).order('sort_order'),
    supabase.from('locations').select('id, name').eq('is_active', true).order('name'),
    supabase.from('visitors').select('id, name, city').eq('is_active', true).order('name'),
    supabase.from('audiologists').select('id, name, location_id').eq('is_active', true).order('name'),
  ]);
  const techOpts = (techs ?? []).map((t) => ({ id: t.id, label: t.name }));
  const platOpts = (plats ?? []).map((p) => ({ id: p.id, label: p.code }));
  const locOpts = (locs ?? []).map((l) => ({ id: l.id, label: l.name }));
  const visitorOpts = (visitorsCat ?? []).map((v: any) => ({ id: v.id, label: v.city ? `${v.name} · ${v.city}` : v.name }));
  const audioOpts = (audioCat ?? []).map((a: any) => ({ id: a.id, name: a.name, locationId: a.location_id }));

  if (!patient) notFound();

  // Timeline cronológico combinado
  type Ev = { at: string; type: string; title: string; body?: string; color: string };
  const events: Ev[] = [];
  events.push({ at: patient.created_at, type: 'create', title: 'Paciente creado', color: '#0A2B5E' });
  if (patient.first_contact_at) events.push({ at: patient.first_contact_at, type: 'contact', title: 'Primer contacto', color: '#706F6F' });
  if (patient.appointment_at) events.push({ at: patient.appointment_at, type: 'appointment', title: `Cita: ${patient.appointment_status}`, color: '#D97706' });
  for (const n of notes ?? []) events.push({ at: n.created_at, type: 'note', title: 'Evolución clínica', body: n.body, color: '#041E42' });
  for (const f of followups ?? []) events.push({ at: f.created_at, type: 'followup', title: 'Seguimiento', body: f.comment, color: '#0A2B5E' });
  for (const r of reports ?? []) events.push({ at: r.generated_at ?? r.created_at, type: 'report', title: `Informe: ${r.title}`, color: '#16A34A' });
  for (const c of commissions ?? []) {
    events.push({
      at: c.generated_at, type: 'commission',
      title: `Comisión generada: ${cop(Number(c.amount))}`,
      body: c.status === 'paid' ? `Pagada el ${new Date(c.paid_at!).toLocaleDateString('es-CO')}` : 'Pendiente',
      color: c.status === 'paid' ? '#16A34A' : '#D97706',
    });
  }
  if (patient.sale_closed_at) events.push({ at: patient.sale_closed_at, type: 'sale', title: 'Venta cerrada', color: '#16A34A' });
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <DashboardLayout userName={me.full_name}>
      <Link href={`/users/${id}`} className="text-sm text-secondary hover:text-primary">
        ← {pro?.full_name ?? 'Profesional'}
      </Link>

      <div className="mt-4 flex items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary font-semibold">Paciente</p>
          <h1 className="text-3xl font-bold text-primary mt-1">{patient.full_name}</h1>
          <p className="text-secondary text-sm mt-1">
            CC {patient.cedula} · {patient.phone}
            {patient.city?.name && ` · ${patient.city.name}`}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${patient.sale_closed ? 'bg-success/15 text-success' : 'bg-surface text-primary border border-border'}`}>
          {FUNNEL_STATUS_LABEL[patient.funnel_status as PatientFunnelStatus]}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card title="Información general">
          <GeneralInfoEditor
            patientId={patientId}
            professionalId={id}
            initial={{
              email: patient.email,
              notes: patient.notes,
              appointment_at: patient.appointment_at,
              appointment_status: patient.appointment_status,
              visitor_id: patient.visitor_id,
              location_id: patient.location_id,
              audiologist_id: patient.audiologist_id,
              case_type: patient.case_type ?? 'sale_candidate',
            }}
            visitors={visitorOpts}
            locations={locOpts}
            audiologists={audioOpts}
          />
          <div className="mt-3 pt-3 border-t border-border text-xs text-secondary">
            Primer contacto: {new Date(patient.first_contact_at).toLocaleString('es-CO')}
          </div>
        </Card>

        <Card title="Información comercial">
          <CommercialEditor
            patientId={patientId}
            professionalId={id}
            technologies={techOpts}
            platforms={platOpts}
            locations={locOpts}
            initial={{
              technology_id: patient.technology_id,
              platform_id: patient.platform_id,
              rechargeable: patient.rechargeable,
              binaural: patient.binaural,
              location_id: patient.location_id,
              unit_price: patient.unit_price ? Number(patient.unit_price) : null,
              total_price: patient.total_price ? Number(patient.total_price) : null,
              sale_closed: patient.sale_closed,
              is_opportunity: patient.is_opportunity ?? false,
              discount_percent: Number(patient.discount_percent ?? 0),
            }}
          />
        </Card>
      </div>

      <Card title="Hallazgos clínicos" className="mt-6">
        <ClinicalEditor patientId={patientId} professionalId={id} initial={patient.clinical_findings} />
      </Card>

      <Card title="Comisiones" className="mt-6">
        {(commissions ?? []).length === 0 ? (
          <p className="text-secondary text-sm">Sin comisiones generadas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-secondary">
              <tr>
                <th className="text-left py-2">Fecha</th>
                <th className="text-left py-2">Valor</th>
                <th className="text-left py-2">Estado</th>
                <th className="text-left py-2">Pagada</th>
              </tr>
            </thead>
            <tbody>
              {(commissions ?? []).map((c, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-2">{new Date(c.generated_at).toLocaleDateString('es-CO')}</td>
                  <td className="py-2 font-semibold">{cop(Number(c.amount))}</td>
                  <td className="py-2">{c.status}</td>
                  <td className="py-2">{c.paid_at ? new Date(c.paid_at).toLocaleDateString('es-CO') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Timeline" className="mt-6">
        <ol className="space-y-3">
          {events.map((e, i) => (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                {i < events.length - 1 && <span className="flex-1 w-px bg-border mt-1" />}
              </div>
              <div className="flex-1 pb-2">
                <p className="text-xs text-secondary">{new Date(e.at).toLocaleString('es-CO')}</p>
                <p className="font-semibold text-primary text-sm">{e.title}</p>
                {e.body && <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{e.body}</p>}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Informe médico (nuevo)" className="mt-6">
        <ReportComposer patientId={patientId} professionalId={id} />
      </Card>

      <Card title={`Informes generados (${reports?.length ?? 0})`} className="mt-6">
        {(reports ?? []).length === 0 ? (
          <p className="text-secondary text-sm">Aún no hay informes.</p>
        ) : (
          <ul className="space-y-3">
            {(reports ?? []).map((r) => (
              <li key={r.id} className="bg-surface/60 border border-border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-primary">{r.title}</p>
                  <span className="text-xs text-secondary">
                    {new Date(r.generated_at ?? r.created_at).toLocaleString('es-CO')}
                  </span>
                </div>
                {r.ai_body && (
                  <pre className="whitespace-pre-wrap text-foreground text-sm mt-2 max-h-64 overflow-y-auto">
                    {r.ai_body}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`Evoluciones (${notes?.length ?? 0})`} className="mt-6">
        <NoteAdder patientId={patientId} professionalId={id} kind="note" />
        {(notes ?? []).length === 0 ? (
          <p className="text-secondary text-sm">Sin evoluciones.</p>
        ) : (
          <ul className="space-y-3">
            {(notes ?? []).map((n) => (
              <li key={n.id} className="bg-surface/60 border border-border rounded-lg p-3">
                <p className="text-xs text-secondary">{new Date(n.created_at).toLocaleString('es-CO')}</p>
                <p className="text-foreground mt-1 whitespace-pre-wrap">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`Seguimientos (${followups?.length ?? 0})`} className="mt-6">
        <NoteAdder patientId={patientId} professionalId={id} kind="followup" />
        {(followups ?? []).length === 0 ? (
          <p className="text-secondary text-sm">Sin seguimientos.</p>
        ) : (
          <ul className="space-y-3">
            {(followups ?? []).map((f) => (
              <li key={f.id} className="bg-surface/60 border border-border rounded-lg p-3">
                <p className="text-xs text-secondary">{new Date(f.created_at).toLocaleString('es-CO')}</p>
                <p className="text-foreground mt-1 whitespace-pre-wrap">{f.comment}</p>
                {f.next_action && (
                  <p className="text-xs text-primary mt-2">→ {f.next_action}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </DashboardLayout>
  );
}

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-border rounded-2xl p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-1.5 gap-4 text-sm">
      <span className="text-xs uppercase tracking-wider text-secondary font-semibold flex-shrink-0">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}
