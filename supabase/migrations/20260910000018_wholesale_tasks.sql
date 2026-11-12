-- =====================================================================
-- Wholesale F18 · Pendientes y bloc de notas personal
-- Cada persona lleva sus pendientes; coordinación puede asignarle
-- tareas a cualquiera. El bloc de notas es privado.
-- =====================================================================
create table if not exists public.wholesale_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  due_on date,
  client_id uuid references public.wholesale_clients(id) on delete set null,
  done_at timestamptz,
  created_by uuid references public.profiles(id),
  created_by_name text,
  created_at timestamptz not null default now()
);
create index if not exists wholesale_tasks_owner_idx on public.wholesale_tasks(owner_id, done_at, due_on);

create table if not exists public.wholesale_notepads (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.wholesale_tasks to authenticated;
grant select, insert, update, delete on public.wholesale_notepads to authenticated;
alter table public.wholesale_tasks enable row level security;
alter table public.wholesale_notepads enable row level security;

drop policy if exists "wholesale_tasks_own" on public.wholesale_tasks;
create policy "wholesale_tasks_own" on public.wholesale_tasks
  for all to authenticated
  using (owner_id = auth.uid() or created_by = auth.uid() or public.is_wholesale_coordinator(auth.uid()))
  with check (owner_id = auth.uid() or public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_notepads_own" on public.wholesale_notepads;
create policy "wholesale_notepads_own" on public.wholesale_notepads
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
