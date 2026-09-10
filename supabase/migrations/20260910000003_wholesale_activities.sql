-- =====================================================================
-- Wholesale F3 · Agenda del comercial y objetivos mensuales de actividad
-- Coordinación fija cuántas actividades de cada tipo se esperan al mes
-- (presenciales, virtuales, viajes, capacitaciones, jornadas, llamadas y
-- WhatsApp); el comercial agenda y marca lo que cumple.
-- =====================================================================

do $$ begin
  create type wholesale_activity_kind as enum (
    'presencial', 'virtual', 'viaje', 'capacitacion', 'jornada', 'llamada', 'whatsapp'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type wholesale_activity_status as enum ('planned', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

-- ============================= ACTIVIDADES ============================
create table if not exists public.wholesale_activities (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.wholesale_reps(id) on delete cascade,
  client_id uuid references public.wholesale_clients(id) on delete set null,
  kind wholesale_activity_kind not null,
  scheduled_on date not null,
  starts_at time,
  title text not null,
  notes text,
  status wholesale_activity_status not null default 'planned',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists wholesale_activities_rep_date_idx
  on public.wholesale_activities(rep_id, scheduled_on) where deleted_at is null;
create index if not exists wholesale_activities_client_idx
  on public.wholesale_activities(client_id) where deleted_at is null;

-- ======================= OBJETIVOS DE ACTIVIDAD =======================
create table if not exists public.wholesale_activity_targets (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.wholesale_reps(id) on delete cascade,
  year integer not null check (year between 2020 and 2100),
  month integer not null check (month between 1 and 12),
  kind wholesale_activity_kind not null,
  target integer not null default 0 check (target >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rep_id, year, month, kind)
);

create index if not exists wholesale_activity_targets_rep_idx
  on public.wholesale_activity_targets(rep_id, year desc, month);

-- ============================== TRIGGERS ==============================
drop trigger if exists trg_wholesale_activities_updated_at on public.wholesale_activities;
create trigger trg_wholesale_activities_updated_at before update on public.wholesale_activities
  for each row execute function public.set_updated_at();

drop trigger if exists trg_wholesale_activity_targets_updated_at on public.wholesale_activity_targets;
create trigger trg_wholesale_activity_targets_updated_at before update on public.wholesale_activity_targets
  for each row execute function public.set_updated_at();

-- ================================ RLS =================================
grant select, insert, update, delete on public.wholesale_activities to authenticated;
grant select, insert, update, delete on public.wholesale_activity_targets to authenticated;

alter table public.wholesale_activities enable row level security;
alter table public.wholesale_activity_targets enable row level security;

-- Agenda: coordinación ve y edita todo; el comercial maneja la suya.
drop policy if exists "wholesale_activities_coordinator" on public.wholesale_activities;
create policy "wholesale_activities_coordinator" on public.wholesale_activities
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_activities_rep_all" on public.wholesale_activities;
create policy "wholesale_activities_rep_all" on public.wholesale_activities
  for all to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()))
  with check (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));

-- Objetivos de actividad: los fija coordinación, el comercial los lee.
drop policy if exists "wholesale_activity_targets_coordinator" on public.wholesale_activity_targets;
create policy "wholesale_activity_targets_coordinator" on public.wholesale_activity_targets
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_activity_targets_rep_read" on public.wholesale_activity_targets;
create policy "wholesale_activity_targets_rep_read" on public.wholesale_activity_targets
  for select to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));
