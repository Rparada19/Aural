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
  bilateralCount: number;
  unilateralCount: number;
  aidsQuoted: number;
  aidsSold: number;
  conversionRate: number; // 0-100
  monthlyReferrals: { month: string; total: number }[]; // últimos 6 meses
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
      bilateralCount: 0, unilateralCount: 0,
      aidsQuoted: 0, aidsSold: 0,
      conversionRate: 0,
      monthlyReferrals: [],
    };
  }

  const [patients, commissions, payments, upcoming] = await Promise.all([
    supabase.from('patients').select('sale_closed, total_price, case_type, binaural, hearing_loss_side, created_at').eq('professional_id', user.id).is('deleted_at', null),
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

  // Lateralidad
  const sideEligible = allPatients.filter((p: any) => p.case_type === 'sale_candidate' || p.case_type === 'sudden_hearing_loss');
  const bilateralCount = sideEligible.filter((p: any) => p.hearing_loss_side === 'bilateral').length;
  const unilateralCount = sideEligible.filter((p: any) => p.hearing_loss_side === 'unilateral').length;

  // Audífonos cotizados vs vendidos
  const aidsOf = (p: any) => (p.binaural ? 2 : 1);
  const aidsQuoted = allPatients.filter((p: any) => p.total_price).reduce((s, p) => s + aidsOf(p), 0);
  const aidsSold = allPatients.filter((p: any) => p.sale_closed).reduce((s, p) => s + aidsOf(p), 0);

  // Conversión: ventas cerradas / pacientes
  const conversionRate = allPatients.length > 0 ? Math.round((salesClosed / allPatients.length) * 100) : 0;

  // Referidos por mes (últimos 6 meses)
  const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const now = new Date();
  const monthlyReferrals: { month: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear(); const m = d.getMonth();
    const total = allPatients.filter((p: any) => {
      const cd = new Date(p.created_at);
      return cd.getFullYear() === y && cd.getMonth() === m;
    }).length;
    monthlyReferrals.push({ month: MONTHS_SHORT[m] ?? '', total });
  }

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
    bilateralCount,
    unilateralCount,
    aidsQuoted,
    aidsSold,
    conversionRate,
    monthlyReferrals,
  };
}
