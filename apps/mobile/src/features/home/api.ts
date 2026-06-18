import { supabase } from '../../lib/supabase';

export interface ProfessionalStats {
  patientsTotal: number;
  salesClosed: number;
  salesQuoted: number;
  amountSold: number;
  amountQuoted: number;
  commissionGenerated: number;
  commissionPaid: number;
  commissionPending: number;
  upcomingAppointments: number;
  caseHearingLoss: number;
  caseNormal: number;
  caseSudden: number;
  casePending: number;
}

export async function getProfessionalStats(): Promise<ProfessionalStats> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      patientsTotal: 0, salesClosed: 0, salesQuoted: 0,
      amountSold: 0, amountQuoted: 0,
      commissionGenerated: 0, commissionPaid: 0, commissionPending: 0,
      upcomingAppointments: 0,
      caseHearingLoss: 0, caseNormal: 0, caseSudden: 0, casePending: 0,
    };
  }

  const [patients, commissions, payments, upcoming] = await Promise.all([
    supabase.from('patients').select('sale_closed, total_price, case_type').eq('professional_id', user.id).is('deleted_at', null),
    supabase.from('commissions').select('amount').eq('professional_id', user.id),
    supabase.from('payments').select('amount').eq('professional_id', user.id),
    supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .eq('professional_id', user.id)
      .gte('appointment_at', new Date().toISOString())
      .in('appointment_status', ['pending', 'confirmed']),
  ]);

  const allPatients = patients.data ?? [];
  const allCommissions = commissions.data ?? [];
  const allPayments = payments.data ?? [];

  const salesClosed = allPatients.filter((p) => p.sale_closed).length;
  const salesQuoted = allPatients.filter((p) => !p.sale_closed && p.total_price).length;
  const amountSold = allPatients
    .filter((p) => p.sale_closed)
    .reduce((s, p) => s + Number(p.total_price ?? 0), 0);
  const amountQuoted = allPatients
    .filter((p) => !p.sale_closed && p.total_price)
    .reduce((s, p) => s + Number(p.total_price ?? 0), 0);

  const commissionGenerated = allCommissions.reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const commissionPaid = allPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const commissionPending = Math.max(0, commissionGenerated - commissionPaid);

  const caseHearingLoss = allPatients.filter((p) => p.case_type === 'sale_candidate').length;
  const caseNormal = allPatients.filter((p) => p.case_type === 'normal_hearing').length;
  const caseSudden = allPatients.filter((p) => p.case_type === 'sudden_hearing_loss').length;
  const casePending = allPatients.filter((p) => p.case_type === 'pending_evaluation').length;

  return {
    patientsTotal: allPatients.length,
    salesClosed,
    salesQuoted,
    amountSold,
    amountQuoted,
    commissionGenerated,
    commissionPaid,
    commissionPending,
    upcomingAppointments: upcoming.count ?? 0,
    caseHearingLoss,
    caseNormal,
    caseSudden,
    casePending,
  };
}
