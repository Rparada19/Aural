-- =====================================================================
-- Wholesale F7 · Préstamos de audífonos para prueba
-- El comercial deja equipos en el centro para que los pruebe con sus
-- pacientes. Plazo de 14 días; si el centro lo vende, el préstamo se
-- convierte en venta y deja de contar como equipo prestado.
-- =====================================================================

do $$ begin
  create type wholesale_loan_status as enum ('active', 'returned', 'sold', 'lost');
exception when duplicate_object then null; end $$;

create table if not exists public.wholesale_loans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.wholesale_clients(id) on delete cascade,
  rep_id uuid references public.wholesale_reps(id),

  loaned_on date not null default current_date,
  due_on date not null,
  returned_on date,

  -- Mismos ejes que la venta, para que al vender no haya que redigitar
  platform text references public.wholesale_platforms(slug),
  tech_level text references public.wholesale_tech_levels(slug),
  style text references public.wholesale_product_styles(slug),
  units integer not null default 1 check (units > 0),
  binaural boolean not null default false,
  rechargeable boolean not null default false,

  -- Un serial por equipo prestado: es lo que hay que recuperar
  serials text[] not null default '{}',

  patient_name text,
  notes text,

  status wholesale_loan_status not null default 'active',
  sale_id uuid references public.wholesale_sales(id) on delete set null,

  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- El plazo por defecto son 14 días desde el préstamo
alter table public.wholesale_loans
  alter column due_on set default (current_date + 14);

create index if not exists wholesale_loans_client_idx
  on public.wholesale_loans(client_id, due_on) where deleted_at is null;
create index if not exists wholesale_loans_rep_idx
  on public.wholesale_loans(rep_id, due_on) where deleted_at is null;
create index if not exists wholesale_loans_open_idx
  on public.wholesale_loans(due_on) where deleted_at is null and status = 'active';

drop trigger if exists trg_wholesale_loans_updated_at on public.wholesale_loans;
create trigger trg_wholesale_loans_updated_at before update on public.wholesale_loans
  for each row execute function public.set_updated_at();

-- ================================ RLS =================================
grant select, insert, update, delete on public.wholesale_loans to authenticated;
alter table public.wholesale_loans enable row level security;

drop policy if exists "wholesale_loans_coordinator" on public.wholesale_loans;
create policy "wholesale_loans_coordinator" on public.wholesale_loans
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_loans_rep_all" on public.wholesale_loans;
create policy "wholesale_loans_rep_all" on public.wholesale_loans
  for all to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()))
  with check (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));
