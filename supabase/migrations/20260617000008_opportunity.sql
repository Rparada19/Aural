alter table public.patients
  add column if not exists is_opportunity boolean not null default false;

create index if not exists patients_opportunity_idx
  on public.patients(is_opportunity) where deleted_at is null and is_opportunity = true;
