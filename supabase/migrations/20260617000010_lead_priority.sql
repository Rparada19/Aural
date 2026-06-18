-- =====================================================================
-- F11 · Oportunidades del médico (leads desde mobile)
-- =====================================================================

do $$ begin
  create type lead_priority as enum ('alta','media','normal');
exception when duplicate_object then null; end $$;

alter table public.patients
  add column if not exists priority lead_priority,
  add column if not exists address text,
  add column if not exists city_text text,
  add column if not exists created_by_role text;

create index if not exists patients_priority_idx
  on public.patients(priority) where deleted_at is null and priority is not null;

-- cédula deja de ser obligatoria para leads del médico (puede no saberla)
alter table public.patients alter column cedula drop not null;
-- la restricción unique(professional_id, cedula) sigue valiendo cuando cedula no es null
