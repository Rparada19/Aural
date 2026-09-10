-- =====================================================================
-- Wholesale F4 · Gastos comerciales imputados al cliente
-- Sirve para responder cuánto invertimos en cada centro auditivo y
-- compararlo contra lo que nos compra.
-- =====================================================================

create table if not exists public.wholesale_expense_categories (
  slug text primary key,
  label text not null,
  icon text not null default '💸',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.wholesale_expense_categories (slug, label, icon, sort_order) values
  ('transporte',    'Transporte',            '🚗', 10),
  ('alimentacion',  'Alimentación',          '🍽️', 20),
  ('hospedaje',     'Hospedaje',             '🏨', 30),
  ('material',      'Material POP',          '🎁', 40),
  ('evento',        'Evento o jornada',      '📣', 50),
  ('capacitacion',  'Capacitación',          '🎓', 60),
  ('otro',          'Otro',                  '💸', 90)
on conflict (slug) do nothing;

create table if not exists public.wholesale_expenses (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.wholesale_reps(id) on delete cascade,
  client_id uuid references public.wholesale_clients(id) on delete set null,
  category text not null references public.wholesale_expense_categories(slug),
  spent_on date not null,
  amount numeric(14,2) not null check (amount >= 0),
  description text,
  receipt_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists wholesale_expenses_rep_idx
  on public.wholesale_expenses(rep_id, spent_on desc) where deleted_at is null;
create index if not exists wholesale_expenses_client_idx
  on public.wholesale_expenses(client_id, spent_on desc) where deleted_at is null;

drop trigger if exists trg_wholesale_expense_categories_updated_at on public.wholesale_expense_categories;
create trigger trg_wholesale_expense_categories_updated_at before update on public.wholesale_expense_categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_wholesale_expenses_updated_at on public.wholesale_expenses;
create trigger trg_wholesale_expenses_updated_at before update on public.wholesale_expenses
  for each row execute function public.set_updated_at();

-- ================================ RLS =================================
grant select, insert, update, delete on public.wholesale_expense_categories to authenticated;
grant select, insert, update, delete on public.wholesale_expenses to authenticated;

alter table public.wholesale_expense_categories enable row level security;
alter table public.wholesale_expenses enable row level security;

drop policy if exists "wholesale_expense_categories_read" on public.wholesale_expense_categories;
create policy "wholesale_expense_categories_read" on public.wholesale_expense_categories
  for select to authenticated
  using (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_rep(auth.uid()));

drop policy if exists "wholesale_expense_categories_write" on public.wholesale_expense_categories;
create policy "wholesale_expense_categories_write" on public.wholesale_expense_categories
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

-- Coordinación ve el gasto de todo el canal; el comercial, el suyo.
drop policy if exists "wholesale_expenses_coordinator" on public.wholesale_expenses;
create policy "wholesale_expenses_coordinator" on public.wholesale_expenses
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_expenses_rep_all" on public.wholesale_expenses;
create policy "wholesale_expenses_rep_all" on public.wholesale_expenses
  for all to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()))
  with check (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));
