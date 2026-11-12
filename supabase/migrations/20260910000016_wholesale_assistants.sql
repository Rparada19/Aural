-- =====================================================================
-- Wholesale F16 · Asistentes de servicio al cliente audiológico,
-- bloqueo de usuarios, módulos visibles por persona y casos de servicio.
-- =====================================================================

alter type public.admin_role add value if not exists 'wholesale_assistant';

alter table public.profiles
  add column if not exists wholesale_blocked boolean not null default false,
  add column if not exists wholesale_modules text[];

-- Un usuario bloqueado deja de tener cualquier permiso en wholesale.
-- El administrador (is_admin) nunca se bloquea.
create or replace function public.is_wholesale_coordinator(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.is_admin
        or (p.admin_role::text = 'wholesale_coordinator' and not p.wholesale_blocked)
    from public.profiles p where p.id = uid
  ), false);
$$;

create or replace function public.is_wholesale_rep(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.admin_role::text = 'wholesale_rep' and not p.wholesale_blocked
    from public.profiles p where p.id = uid
  ), false);
$$;

create or replace function public.is_wholesale_assistant(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.admin_role::text = 'wholesale_assistant' and not p.wholesale_blocked
    from public.profiles p where p.id = uid
  ), false);
$$;

-- ============================ Casos ===================================
create table if not exists public.wholesale_cases (
  id uuid primary key default gen_random_uuid(),
  number serial,
  client_id uuid not null references public.wholesale_clients(id) on delete cascade,
  kind text not null default 'soporte'
    check (kind in ('reparacion', 'garantia', 'soporte', 'pedido', 'despacho', 'devolucion', 'otro')),
  priority text not null default 'media' check (priority in ('alta', 'media', 'baja')),
  status text not null default 'abierto'
    check (status in ('abierto', 'en_proceso', 'esperando_cliente', 'esperando_fabrica', 'resuelto', 'cerrado')),
  subject text not null,
  description text,
  patient_name text,
  serial text,
  due_on date,
  assigned_to uuid references public.profiles(id),
  assigned_name text,
  created_by uuid references public.profiles(id),
  created_by_name text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists wholesale_cases_open_idx on public.wholesale_cases(status, due_on) where deleted_at is null;
create index if not exists wholesale_cases_client_idx on public.wholesale_cases(client_id) where deleted_at is null;

drop trigger if exists trg_wholesale_cases_updated_at on public.wholesale_cases;
create trigger trg_wholesale_cases_updated_at before update on public.wholesale_cases
  for each row execute function public.set_updated_at();

create table if not exists public.wholesale_case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.wholesale_cases(id) on delete cascade,
  author_id uuid references public.profiles(id),
  author_name text,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists wholesale_case_notes_case_idx on public.wholesale_case_notes(case_id, created_at);

grant select, insert, update, delete on public.wholesale_cases to authenticated;
grant select, insert, update, delete on public.wholesale_case_notes to authenticated;
grant usage, select on sequence public.wholesale_cases_number_seq to authenticated;
alter table public.wholesale_cases enable row level security;
alter table public.wholesale_case_notes enable row level security;

create or replace function public.wholesale_can_case(uid uuid, cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_wholesale_coordinator(uid) or public.is_wholesale_assistant(uid)
      or exists (
        select 1 from wholesale_cases c join wholesale_clients cl on cl.id = c.client_id
        where c.id = cid and public.is_wholesale_rep(uid) and cl.rep_id = public.wholesale_rep_id(uid)
      );
$$;

drop policy if exists "wholesale_cases_team" on public.wholesale_cases;
create policy "wholesale_cases_team" on public.wholesale_cases
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_assistant(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_assistant(auth.uid()));

-- El comercial ve y abre casos de los clientes de su cartera
drop policy if exists "wholesale_cases_rep" on public.wholesale_cases;
create policy "wholesale_cases_rep" on public.wholesale_cases
  for all to authenticated
  using (public.is_wholesale_rep(auth.uid()) and exists (
    select 1 from public.wholesale_clients cl where cl.id = client_id and cl.rep_id = public.wholesale_rep_id(auth.uid())))
  with check (public.is_wholesale_rep(auth.uid()) and exists (
    select 1 from public.wholesale_clients cl where cl.id = client_id and cl.rep_id = public.wholesale_rep_id(auth.uid())));

drop policy if exists "wholesale_case_notes_all" on public.wholesale_case_notes;
create policy "wholesale_case_notes_all" on public.wholesale_case_notes
  for all to authenticated
  using (public.wholesale_can_case(auth.uid(), case_id))
  with check (public.wholesale_can_case(auth.uid(), case_id));

-- =================== Lo que el asistente puede ver =====================
drop policy if exists "wholesale_clients_assistant" on public.wholesale_clients;
create policy "wholesale_clients_assistant" on public.wholesale_clients
  for select to authenticated using (public.is_wholesale_assistant(auth.uid()));

drop policy if exists "wholesale_reps_assistant" on public.wholesale_reps;
create policy "wholesale_reps_assistant" on public.wholesale_reps
  for select to authenticated using (public.is_wholesale_assistant(auth.uid()));

-- Historial de compras: para validar garantías y equipos del paciente
drop policy if exists "wholesale_sales_assistant" on public.wholesale_sales;
create policy "wholesale_sales_assistant" on public.wholesale_sales
  for select to authenticated using (public.is_wholesale_assistant(auth.uid()));

drop policy if exists "wholesale_loans_assistant" on public.wholesale_loans;
create policy "wholesale_loans_assistant" on public.wholesale_loans
  for all to authenticated
  using (public.is_wholesale_assistant(auth.uid()))
  with check (public.is_wholesale_assistant(auth.uid()));

drop policy if exists "wholesale_contacts_assistant" on public.wholesale_contacts;
create policy "wholesale_contacts_assistant" on public.wholesale_contacts
  for all to authenticated
  using (public.is_wholesale_assistant(auth.uid()))
  with check (public.is_wholesale_assistant(auth.uid()));

drop policy if exists "wholesale_documents_assistant" on public.wholesale_documents;
create policy "wholesale_documents_assistant" on public.wholesale_documents
  for select to authenticated using (public.is_wholesale_assistant(auth.uid()));

drop policy if exists "wholesale_docs_assistant_read" on storage.objects;
create policy "wholesale_docs_assistant_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'wholesale-docs' and public.is_wholesale_assistant(auth.uid()));

-- CRM: el asistente registra prospectos que llaman y deja interacciones
drop policy if exists "wholesale_opps_assistant" on public.wholesale_opportunities;
create policy "wholesale_opps_assistant" on public.wholesale_opportunities
  for all to authenticated
  using (public.is_wholesale_assistant(auth.uid()))
  with check (public.is_wholesale_assistant(auth.uid()));

create or replace function public.wholesale_can_opp(uid uuid, opp uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_wholesale_coordinator(uid) or public.is_wholesale_assistant(uid)
      or exists (
        select 1 from wholesale_opportunities o
        where o.id = opp
          and public.is_wholesale_rep(uid)
          and o.rep_id = public.wholesale_rep_id(uid)
      );
$$;
