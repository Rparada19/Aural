-- Presupuesto por visitador por mes
create table if not exists public.visitor_budgets (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  year integer not null check (year between 2020 and 2100),
  month integer not null check (month between 1 and 12),
  amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(visitor_id, year, month)
);

create index if not exists visitor_budgets_visitor_idx on public.visitor_budgets(visitor_id, year desc, month desc);

drop trigger if exists trg_visitor_budgets_updated_at on public.visitor_budgets;
create trigger trg_visitor_budgets_updated_at before update on public.visitor_budgets
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.visitor_budgets to authenticated;
alter table public.visitor_budgets enable row level security;

drop policy if exists "visitor_budgets_admin" on public.visitor_budgets;
create policy "visitor_budgets_admin" on public.visitor_budgets
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
