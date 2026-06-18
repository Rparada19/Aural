-- =====================================================================
-- Aural · F7 · Visitadores médicos + Audiólogos por sede
-- =====================================================================

create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email citext,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.audiologists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email citext,
  location_id uuid references public.locations(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.patients
  add column if not exists visitor_id uuid references public.visitors(id),
  add column if not exists audiologist_id uuid references public.audiologists(id);

create index if not exists patients_visitor_idx on public.patients(visitor_id) where deleted_at is null;
create index if not exists patients_audiologist_idx on public.patients(audiologist_id) where deleted_at is null;

drop trigger if exists trg_visitors_updated_at on public.visitors;
create trigger trg_visitors_updated_at before update on public.visitors
  for each row execute function public.set_updated_at();

drop trigger if exists trg_audiologists_updated_at on public.audiologists;
create trigger trg_audiologists_updated_at before update on public.audiologists
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.visitors to authenticated;
grant select, insert, update, delete on public.audiologists to authenticated;

alter table public.visitors enable row level security;
alter table public.audiologists enable row level security;

drop policy if exists "visitors_read" on public.visitors;
create policy "visitors_read" on public.visitors
  for select to authenticated using (public.is_approved(auth.uid()));
drop policy if exists "visitors_admin_all" on public.visitors;
create policy "visitors_admin_all" on public.visitors
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "audiologists_read" on public.audiologists;
create policy "audiologists_read" on public.audiologists
  for select to authenticated using (public.is_approved(auth.uid()));
drop policy if exists "audiologists_admin_all" on public.audiologists;
create policy "audiologists_admin_all" on public.audiologists
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
