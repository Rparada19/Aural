-- =====================================================================
-- Wholesale F17 · Presupuesto oficial por zona y mes
-- Se carga desde Excel: ventas del año anterior (guía), presupuesto en
-- unidades y valor, y costo de venta en pesos.
-- =====================================================================
create table if not exists public.wholesale_zone_budgets (
  id uuid primary key default gen_random_uuid(),
  zone text not null,
  year integer not null,
  month integer not null check (month between 1 and 12),
  prev_units integer not null default 0,
  prev_amount numeric(16,2) not null default 0,
  units integer not null default 0,
  amount numeric(16,2) not null default 0,
  cost numeric(16,2) not null default 0,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (zone, year, month)
);
create index if not exists wholesale_zone_budgets_year_idx on public.wholesale_zone_budgets(year);

grant select, insert, update, delete on public.wholesale_zone_budgets to authenticated;
alter table public.wholesale_zone_budgets enable row level security;

drop policy if exists "wholesale_zone_budgets_coordinator" on public.wholesale_zone_budgets;
create policy "wholesale_zone_budgets_coordinator" on public.wholesale_zone_budgets
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_zone_budgets_rep_read" on public.wholesale_zone_budgets;
create policy "wholesale_zone_budgets_rep_read" on public.wholesale_zone_budgets
  for select to authenticated
  using (public.is_wholesale_rep(auth.uid()));
