export type RoleSlug =
  | 'otorrino'
  | 'audiologo'
  | 'crc'
  | 'otro_profesional'
  | 'funcionario_aural';

export const ROLES: { slug: RoleSlug; label: string }[] = [
  { slug: 'otorrino', label: 'Otorrinolaringólogo' },
  { slug: 'audiologo', label: 'Audióloga / Audiólogo' },
  { slug: 'crc', label: 'CRC' },
  { slug: 'otro_profesional', label: 'Otro profesional' },
  { slug: 'funcionario_aural', label: 'Funcionario Aural' },
];

export type OtorrinoSpecialty = 'otologo' | 'neuro_otologo' | 'laringologo' | 'rinologo';

export const OTORRINO_SPECIALTIES: { slug: OtorrinoSpecialty; label: string }[] = [
  { slug: 'otologo', label: 'Otólogo' },
  { slug: 'neuro_otologo', label: 'Neuro-otólogo' },
  { slug: 'laringologo', label: 'Laringólogo' },
  { slug: 'rinologo', label: 'Rinólogo' },
];

export type ProfileStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type ContentType = 'news' | 'video' | 'event' | 'document';

export type PatientFunnelStatus =
  | 'registered'
  | 'contacted'
  | 'appointment_scheduled'
  | 'attended'
  | 'quoted'
  | 'followup'
  | 'sale_closed'
  | 'sale_lost';

export type TrafficLight = 'green' | 'yellow' | 'red';

export const TRAFFIC_LIGHT_DAYS = { yellow: 7, red: 21 } as const;

export function trafficLight(lastContactIso: string | null | undefined, now = new Date()): TrafficLight {
  if (!lastContactIso) return 'red';
  const diffDays = (now.getTime() - new Date(lastContactIso).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays >= TRAFFIC_LIGHT_DAYS.red) return 'red';
  if (diffDays >= TRAFFIC_LIGHT_DAYS.yellow) return 'yellow';
  return 'green';
}

export const TRAFFIC_LIGHT_COLOR: Record<TrafficLight, string> = {
  green: '#16A34A',
  yellow: '#D97706',
  red: '#DC2626',
};

export const FUNNEL_STATUS_LABEL: Record<PatientFunnelStatus, string> = {
  registered: 'Registrado',
  contacted: 'Contactado',
  appointment_scheduled: 'Cita agendada',
  attended: 'Atendido',
  quoted: 'Cotizado',
  followup: 'Seguimiento',
  sale_closed: 'Venta cerrada',
  sale_lost: 'Venta perdida',
};

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'attended';

export type PatientCaseType =
  | 'pending_evaluation'
  | 'sale_candidate'
  | 'normal_hearing'
  | 'cerumen_removal'
  | 'sudden_hearing_loss'
  | 'other_non_sale';

export const CASE_TYPE_LABEL: Record<PatientCaseType, string> = {
  pending_evaluation: 'Por evaluar',
  sale_candidate: 'Pérdida auditiva',
  normal_hearing: 'Audición normal',
  cerumen_removal: 'Tapón de cera',
  sudden_hearing_loss: 'Hipoacusia súbita',
  other_non_sale: 'Otro (sin venta)',
};

export interface CatalogItem {
  id: string;
  name?: string;
  code?: string;
  is_active: boolean;
}

export interface Patient {
  id: string;
  professional_id: string;
  full_name: string;
  cedula: string;
  phone: string;
  email: string | null;
  city_id: string | null;
  notes: string | null;
  first_contact_at: string;
  appointment_at: string | null;
  appointment_status: AppointmentStatus;
  clinical_findings: string | null;
  technology_id: string | null;
  platform_id: string | null;
  rechargeable: boolean | null;
  binaural: boolean | null;
  assigned_professional_id: string | null;
  location_id: string | null;
  unit_price: number | null;
  total_price: number | null;
  sale_closed: boolean;
  sale_closed_at: string | null;
  funnel_status: PatientFunnelStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  cedula: string;
  email: string;
  phone: string;
  city: string;
  profession: string;
  address: string;
  role: RoleSlug;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
}
