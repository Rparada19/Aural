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
  const { data, error } = await supabase
    .from('medical_reports')
    .select('id, title, generated_at, created_at, patient_id, ai_body')
    .is('deleted_at', null)
    .not('ai_body', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];

  // attach patient + read status separately to avoid embed FK issues
  const patientIds = Array.from(new Set(rows.map((r) => r.patient_id)));
  const reportIds = rows.map((r) => r.id);

  const [{ data: patients }, { data: reads }] = await Promise.all([
    patientIds.length
      ? supabase.from('patients').select('id, full_name').in('id', patientIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    reportIds.length
      ? supabase.from('medical_report_reads').select('medical_report_id').eq('user_id', userId).in('medical_report_id', reportIds)
      : Promise.resolve({ data: [] as { medical_report_id: string }[] }),
  ]);
  const pMap = new Map((patients ?? []).map((p) => [p.id, p]));
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
  const { data, error } = await supabase
    .from('medical_reports')
    .select(`*,
      patient:patient_id (
        full_name, cedula,
        audiologist:audiologist_id (name),
        visitor:visitor_id (name),
        professional:professional_id (full_name)
      )
    `)
    .eq('id', reportId)
    .single();
  if (error) throw error;
  return data;
}

export async function markReportAsRead(reportId: string, userId: string) {
  const { error } = await supabase
    .from('medical_report_reads')
    .upsert({ medical_report_id: reportId, user_id: userId }, { onConflict: 'medical_report_id,user_id' });
  if (error) throw error;
}

export async function countUnreadReports(userId: string) {
  const { data: ids } = await supabase
    .from('medical_reports')
    .select('id')
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
