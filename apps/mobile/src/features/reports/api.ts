import { supabase } from '../../lib/supabase';

export interface ReportRow {
  id: string;
  title: string;
  generated_at: string | null;
  created_at: string;
  patient: { id: string; full_name: string } | null;
  is_read: boolean;
}

export async function listReports(userId: string): Promise<ReportRow[]> {
  // 1. Buscar primero los pacientes propios (filtro explícito por professional_id).
  const { data: myPatients, error: pErr } = await supabase
    .from('patients')
    .select('id, full_name')
    .or(`professional_id.eq.${userId},assigned_professional_id.eq.${userId}`)
    .is('deleted_at', null);
  if (pErr) throw pErr;
  const patientIds = (myPatients ?? []).map((p) => p.id);
  if (patientIds.length === 0) return [];

  // 2. Informes solo de esos pacientes.
  const { data, error } = await supabase
    .from('medical_reports')
    .select('id, title, generated_at, created_at, patient_id')
    .in('patient_id', patientIds)
    .is('deleted_at', null)
    .not('ai_body', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const reportIds = rows.map((r) => r.id);

  const { data: reads } = reportIds.length
    ? await supabase.from('medical_report_reads').select('medical_report_id').eq('user_id', userId).in('medical_report_id', reportIds)
    : { data: [] as { medical_report_id: string }[] };
  const pMap = new Map((myPatients ?? []).map((p) => [p.id, p]));
  const readSet = new Set((reads ?? []).map((r) => r.medical_report_id));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    generated_at: r.generated_at,
    created_at: r.created_at,
    patient: pMap.get(r.patient_id) ?? null,
    is_read: readSet.has(r.id),
  }));
}

export async function getReport(reportId: string) {
  const { data: report, error } = await supabase
    .from('medical_reports')
    .select('*')
    .eq('id', reportId)
    .single();
  if (error) throw error;
  if (!report) return null;

  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name, cedula, audiologist_id, visitor_id, professional_id')
    .eq('id', report.patient_id)
    .maybeSingle();

  let audiologist: { name: string } | null = null;
  let visitor: { name: string } | null = null;
  let professional: { full_name: string } | null = null;

  if (patient?.audiologist_id) {
    const { data } = await supabase.from('audiologists').select('name').eq('id', patient.audiologist_id).maybeSingle();
    audiologist = data ?? null;
  }
  if (patient?.visitor_id) {
    const { data } = await supabase.from('visitors').select('name').eq('id', patient.visitor_id).maybeSingle();
    visitor = data ?? null;
  }
  if (patient?.professional_id) {
    const { data } = await supabase.from('profiles').select('full_name').eq('id', patient.professional_id).maybeSingle();
    professional = data ?? null;
  }

  return { ...report, patient: patient ? { ...patient, audiologist, visitor, professional } : null };
}

export async function markReportAsRead(reportId: string, userId: string) {
  const { error } = await supabase
    .from('medical_report_reads')
    .upsert({ medical_report_id: reportId, user_id: userId }, { onConflict: 'medical_report_id,user_id' });
  if (error) throw error;
}

export async function countUnreadReports(userId: string) {
  const { data: myPatients } = await supabase
    .from('patients')
    .select('id')
    .or(`professional_id.eq.${userId},assigned_professional_id.eq.${userId}`)
    .is('deleted_at', null);
  const patientIds = (myPatients ?? []).map((p) => p.id);
  if (patientIds.length === 0) return 0;
  const { data: ids } = await supabase
    .from('medical_reports')
    .select('id')
    .in('patient_id', patientIds)
    .is('deleted_at', null)
    .not('ai_body', 'is', null);
  const allIds = (ids ?? []).map((r) => r.id);
  if (allIds.length === 0) return 0;
  const { data: reads } = await supabase
    .from('medical_report_reads')
    .select('medical_report_id')
    .eq('user_id', userId)
    .in('medical_report_id', allIds);
  const readCount = (reads ?? []).length;
  return Math.max(0, allIds.length - readCount);
}

export async function signedImageUrl(path: string) {
  const { data } = await supabase.storage.from('medical-exams').createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
