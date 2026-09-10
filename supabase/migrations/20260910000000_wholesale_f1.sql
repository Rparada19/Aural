-- =====================================================================
-- Wholesale F1 · Comerciales, clientes y ventas
-- Mercado mayorista: el distribuidor NO entra al sistema. Entran el
-- comercial de zona, la coordinadora y el administrador.
-- =====================================================================

-- Roles nuevos en el enum existente.
-- Van sueltos a propósito: ALTER TYPE ADD VALUE no corre dentro de un
-- bloque DO, y el valor nuevo no se puede usar en la misma transacción
-- (por eso los helpers de abajo comparan admin_role::text).
alter type admin_role add value if not exists 'wholesale_coordinator';
alter type admin_role add value if not exists 'wholesale_rep';

-- ============================ COMERCIALES =============================
create table if not exists public.wholesale_reps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email citext,
  zone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.profiles
  add column if not exists linked_wholesale_rep_id uuid references public.wholesale_reps(id);

create index if not exists profiles_wholesale_rep_idx
  on public.profiles(linked_wholesale_rep_id) where linked_wholesale_rep_id is not null;

-- ============================== CLIENTES ==============================
create table if not exists public.wholesale_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nit text,
  contact_name text,
  phone text,
  email citext,
  city text,
  zone text,
  rep_id uuid references public.wholesale_reps(id),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists wholesale_clients_rep_idx
  on public.wholesale_clients(rep_id) where deleted_at is null;
create index if not exists wholesale_clients_zone_idx
  on public.wholesale_clients(zone) where deleted_at is null;

-- =============================== VENTAS ===============================
create table if not exists public.wholesale_sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.wholesale_clients(id) on delete cascade,
  rep_id uuid references public.wholesale_reps(id),
  sold_on date not null,
  invoice_number text,
  campaign_id uuid references public.marketing_campaigns(id),
  -- Paciente final del centro auditivo. Se guarda para que el audiólogo
  -- lo identifique en el recordatorio de garantía (F6).
  patient_name text,
  patient_document text,
  technology_id uuid references public.technologies(id),
  units integer not null default 1 check (units > 0),
  binaural boolean not null default false,
  rechargeable boolean not null default false,
  list_price numeric(14,2) not null default 0,
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  net_amount numeric(14,2) not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists wholesale_sales_client_idx
  on public.wholesale_sales(client_id, sold_on desc) where deleted_at is null;
create index if not exists wholesale_sales_rep_idx
  on public.wholesale_sales(rep_id, sold_on desc) where deleted_at is null;
create index if not exists wholesale_sales_period_idx
  on public.wholesale_sales(sold_on desc) where deleted_at is null;

-- ============================== TRIGGERS ==============================
drop trigger if exists trg_wholesale_reps_updated_at on public.wholesale_reps;
create trigger trg_wholesale_reps_updated_at before update on public.wholesale_reps
  for each row execute function public.set_updated_at();

drop trigger if exists trg_wholesale_clients_updated_at on public.wholesale_clients;
create trigger trg_wholesale_clients_updated_at before update on public.wholesale_clients
  for each row execute function public.set_updated_at();

drop trigger if exists trg_wholesale_sales_updated_at on public.wholesale_sales;
create trigger trg_wholesale_sales_updated_at before update on public.wholesale_sales
  for each row execute function public.set_updated_at();

-- ============================== HELPERS ===============================
create or replace function public.is_wholesale_coordinator(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.profiles where id = uid),
    (select admin_role::text = 'wholesale_coordinator' from public.profiles where id = uid),
    false
  );
$$;

create or replace function public.is_wholesale_rep(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select admin_role::text = 'wholesale_rep' from public.profiles where id = uid), false);
$$;

create or replace function public.wholesale_rep_id(uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select linked_wholesale_rep_id from public.profiles where id = uid;
$$;

-- ================================ RLS =================================
grant select, insert, update, delete on public.wholesale_reps to authenticated;
grant select, insert, update, delete on public.wholesale_clients to authenticated;
grant select, insert, update, delete on public.wholesale_sales to authenticated;

alter table public.wholesale_reps enable row level security;
alter table public.wholesale_clients enable row level security;
alter table public.wholesale_sales enable row level security;

-- Comerciales: coordinación administra; el comercial se ve a sí mismo.
drop policy if exists "wholesale_reps_coordinator" on public.wholesale_reps;
create policy "wholesale_reps_coordinator" on public.wholesale_reps
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_reps_self_read" on public.wholesale_reps;
create policy "wholesale_reps_self_read" on public.wholesale_reps
  for select to authenticated
  using (public.is_wholesale_rep(auth.uid()) and id = public.wholesale_rep_id(auth.uid()));

-- Clientes: coordinación ve todo; el comercial solo su cartera.
drop policy if exists "wholesale_clients_coordinator" on public.wholesale_clients;
create policy "wholesale_clients_coordinator" on public.wholesale_clients
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_clients_rep_read" on public.wholesale_clients;
create policy "wholesale_clients_rep_read" on public.wholesale_clients
  for select to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));

-- Ventas: coordinación todo; el comercial lee y carga las de su cartera.
drop policy if exists "wholesale_sales_coordinator" on public.wholesale_sales;
create policy "wholesale_sales_coordinator" on public.wholesale_sales
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_sales_rep_read" on public.wholesale_sales;
create policy "wholesale_sales_rep_read" on public.wholesale_sales
  for select to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));

drop policy if exists "wholesale_sales_rep_write" on public.wholesale_sales;
create policy "wholesale_sales_rep_write" on public.wholesale_sales
  for insert to authenticated
  with check (
    public.is_wholesale_rep(auth.uid())
    and rep_id = public.wholesale_rep_id(auth.uid())
    and exists (
      select 1 from public.wholesale_clients c
      where c.id = client_id and c.rep_id = public.wholesale_rep_id(auth.uid())
    )
  );

drop policy if exists "wholesale_sales_rep_update" on public.wholesale_sales;
create policy "wholesale_sales_rep_update" on public.wholesale_sales
  for update to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()))
  with check (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));
