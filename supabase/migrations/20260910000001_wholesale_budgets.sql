-- =====================================================================
-- Wholesale F1.1 · Presupuesto mensual por cliente (valor y unidades)
-- =====================================================================

create table if not exists public.wholesale_budgets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.wholesale_clients(id) on delete cascade,
  year integer not null check (year between 2020 and 2100),
  month integer not null check (month between 1 and 12),
  amount numeric(14,2) not null default 0,
  units integer not null default 0 check (units >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, year, month)
);

create index if not exists wholesale_budgets_client_idx
  on public.wholesale_budgets(client_id, year desc, month);
create index if not exists wholesale_budgets_period_idx
  on public.wholesale_budgets(year desc, month);

drop trigger if exists trg_wholesale_budgets_updated_at on public.wholesale_budgets;
create trigger trg_wholesale_budgets_updated_at before update on public.wholesale_budgets
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.wholesale_budgets to authenticated;
alter table public.wholesale_budgets enable row level security;

-- Coordinación define el presupuesto; el comercial solo lee el de su cartera.
drop policy if exists "wholesale_budgets_coordinator" on public.wholesale_budgets;
create policy "wholesale_budgets_coordinator" on public.wholesale_budgets
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_budgets_rep_read" on public.wholesale_budgets;
create policy "wholesale_budgets_rep_read" on public.wholesale_budgets
  for select to authenticated
  using (
    public.is_wholesale_rep(auth.uid())
    and exists (
      select 1 from public.wholesale_clients c
      where c.id = wholesale_budgets.client_id
        and c.rep_id = public.wholesale_rep_id(auth.uid())
    )
  );
