alter table public.patients
  add column if not exists discount_percent numeric(5,2) not null default 0;
