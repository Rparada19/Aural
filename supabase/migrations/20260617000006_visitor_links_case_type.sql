-- =====================================================================
-- F8 · Visitadores: asignación a profesionales + presupuesto + tipos de caso
-- =====================================================================

do $$ begin
  create type patient_case_type as enum (
    'sale_candidate',
    'normal_hearing',
    'cerumen_removal',
    'sudden_hearing_loss',
    'other_non_sale'
  );
exception when duplicate_object then null; end $$;

alter table public.visitors
  add column if not exists monthly_budget numeric(14,2);

alter table public.profiles
  add column if not exists visitor_id uuid references public.visitors(id);

create index if not exists profiles_visitor_idx on public.profiles(visitor_id) where deleted_at is null;

alter table public.patients
  add column if not exists case_type patient_case_type not null default 'sale_candidate';

create index if not exists patients_case_type_idx on public.patients(case_type) where deleted_at is null;
