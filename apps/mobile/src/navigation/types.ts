import type { RoleSlug, OtorrinoSpecialty } from '@aural/shared';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  RoleSelect: undefined;
  SubSpecialtySelect: { role: RoleSlug };
  Register: { role: RoleSlug; specialty?: OtorrinoSpecialty };
  Pending: { email: string };
  ForgotPassword: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  Patients: undefined;
  PatientTimeline: { id: string };
  PatientDetail: { id: string };
  Reports: undefined;
  ReportDetail: { id: string };
  Payments: undefined;
  News: undefined;
  NewsDetail: { id: string };
  NewLead: undefined;
};

export type VisitorStackParamList = {
  VisitorHome: undefined;
  VisitorDoctors: undefined;
};
