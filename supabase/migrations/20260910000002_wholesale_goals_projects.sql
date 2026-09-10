-- =====================================================================
-- Wholesale F2 · Objetivos mensuales y proyectos por comercial
-- El objetivo lo define coordinación; el comercial reporta el avance.
-- El proyecto lo puede proponer cualquiera de los dos.
-- =====================================================================

do $$ begin
  create type wholesale_goal_status as enum ('pending', 'in_progress', 'done', 'dropped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wholesale_project_kind as enum ('evento', 'campana', 'capacitacion', 'otro');
exception when duplicate_object then null; end $$;

-- ============================= OBJETIVOS ==============================
create table if not exists public.wholesale_goals (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.wholesale_reps(id) on delete cascade,
  year integer not null check (year between 2020 and 2100),
  month integer not null check (month between 1 and 12),
  title text not null,
  description text,
  target_value numeric(14,2),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  status wholesale_goal_status not null default 'pending',
  progress_note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists wholesale_goals_rep_idx
  on public.wholesale_goals(rep_id, year desc, month) where deleted_at is null;

-- ============================= PROYECTOS ==============================
create table if not exists public.wholesale_projects (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.wholesale_reps(id) on delete cascade,
  client_id uuid references public.wholesale_clients(id) on delete set null,
  title text not null,
  kind wholesale_project_kind not null default 'otro',
  description text,
  starts_on date,
  ends_on date,
  budget_amount numeric(14,2),
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  status wholesale_goal_status not null default 'pending',
  progress_note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists wholesale_projects_rep_idx
  on public.wholesale_projects(rep_id, starts_on desc) where deleted_at is null;
create index if not exists wholesale_projects_client_idx
  on public.wholesale_projects(client_id) where deleted_at is null;

-- ============================== TRIGGERS ==============================
drop trigger if exists trg_wholesale_goals_updated_at on public.wholesale_goals;
create trigger trg_wholesale_goals_updated_at before update on public.wholesale_goals
  for each row execute function public.set_updated_at();

drop trigger if exists trg_wholesale_projects_updated_at on public.wholesale_projects;
create trigger trg_wholesale_projects_updated_at before update on public.wholesale_projects
  for each row execute function public.set_updated_at();

-- ================================ RLS =================================
grant select, insert, update, delete on public.wholesale_goals to authenticated;
grant select, insert, update, delete on public.wholesale_projects to authenticated;

alter table public.wholesale_goals enable row level security;
alter table public.wholesale_projects enable row level security;

-- Objetivos: coordinación los define; el comercial lee y actualiza avance.
drop policy if exists "wholesale_goals_coordinator" on public.wholesale_goals;
create policy "wholesale_goals_coordinator" on public.wholesale_goals
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_goals_rep_read" on public.wholesale_goals;
create policy "wholesale_goals_rep_read" on public.wholesale_goals
  for select to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));

drop policy if exists "wholesale_goals_rep_progress" on public.wholesale_goals;
create policy "wholesale_goals_rep_progress" on public.wholesale_goals
  for update to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()))
  with check (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));

-- Proyectos: los dos pueden proponer; el comercial solo sobre lo suyo.
drop policy if exists "wholesale_projects_coordinator" on public.wholesale_projects;
create policy "wholesale_projects_coordinator" on public.wholesale_projects
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_projects_rep_read" on public.wholesale_projects;
create policy "wholesale_projects_rep_read" on public.wholesale_projects
  for select to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));

drop policy if exists "wholesale_projects_rep_write" on public.wholesale_projects;
create policy "wholesale_projects_rep_write" on public.wholesale_projects
  for insert to authenticated
  with check (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));

drop policy if exists "wholesale_projects_rep_update" on public.wholesale_projects;
create policy "wholesale_projects_rep_update" on public.wholesale_projects
  for update to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()))
  with check (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));
