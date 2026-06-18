-- =====================================================================
-- Aural · F2 · Catálogos + Pacientes (CRM multi-tenant)
-- =====================================================================

-- ============================ ENUMS ===================================
do $$ begin
  create type patient_funnel_status as enum (
    'registered','contacted','appointment_scheduled','attended',
    'quoted','followup','sale_closed','sale_lost'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum ('pending','confirmed','cancelled','attended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sale_status as enum ('quote','closed','lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type commission_status as enum ('pending','paid','cancelled');
exception when duplicate_object then null; end $$;

-- ============================ CATÁLOGOS ================================
create table if not exists public.technologies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city_id uuid references public.cities(id),
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(name, city_id)
);

create table if not exists public.patient_origins (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================ PATIENTS =================================
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references auth.users(id) on delete cascade,

  -- Información general
  full_name text not null,
  cedula text not null,
  phone text not null,
  email citext,
  city_id uuid references public.cities(id),
  notes text,

  -- Contacto / cita
  first_contact_at timestamptz not null default now(),
  appointment_at timestamptz,
  appointment_status appointment_status not null default 'pending',

  -- Clínica
  clinical_findings text,

  -- Comercial
  technology_id uuid references public.technologies(id),
  platform_id uuid references public.platforms(id),
  rechargeable boolean,
  binaural boolean,
  assigned_professional_id uuid references auth.users(id),
  location_id uuid references public.locations(id),
  unit_price numeric(14,2),
  total_price numeric(14,2),
  sale_closed boolean not null default false,
  sale_closed_at timestamptz,
  sale_status sale_status not null default 'quote',

  -- Funnel
  funnel_status patient_funnel_status not null default 'registered',
  origin_id uuid references public.patient_origins(id),

  -- Auditoría
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(professional_id, cedula)
);

create index if not exists patients_professional_idx on public.patients(professional_id) where deleted_at is null;
create index if not exists patients_cedula_idx on public.patients(cedula) where deleted_at is null;
create index if not exists patients_funnel_idx on public.patients(funnel_status) where deleted_at is null;
create index if not exists patients_sale_idx on public.patients(sale_closed) where deleted_at is null;
create index if not exists patients_created_idx on public.patients(created_at desc);

-- ============================ NOTAS / EVOLUCIONES CLÍNICAS =============
create table if not exists public.patient_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists patient_notes_patient_idx on public.patient_notes(patient_id, created_at desc);

-- ============================ SEGUIMIENTOS =============================
create table if not exists public.patient_followups (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  comment text not null,
  next_action text,
  next_action_at timestamptz,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists patient_followups_patient_idx on public.patient_followups(patient_id, created_at desc);
create index if not exists patient_followups_next_action_idx on public.patient_followups(next_action_at) where status = 'open';

-- ============================ INFORMES MÉDICOS =========================
create table if not exists public.medical_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  author_id uuid references auth.users(id),
  title text not null,
  file_url text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists medical_reports_patient_idx on public.medical_reports(patient_id, version desc);

-- ============================ COMISIONES + PAGOS =======================
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  professional_id uuid not null references auth.users(id),
  sale_amount numeric(14,2) not null,
  amount numeric(14,2) not null,
  status commission_status not null default 'pending',
  generated_at timestamptz not null default now(),
  paid_at timestamptz,
  payment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commissions_professional_idx on public.commissions(professional_id, status);
create index if not exists commissions_patient_idx on public.commissions(patient_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references auth.users(id),
  amount numeric(14,2) not null,
  paid_at timestamptz not null default now(),
  channel text not null,
  transaction_ref text,
  attachment_url text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists payments_professional_idx on public.payments(professional_id, paid_at desc);

alter table public.commissions
  add constraint commissions_payment_fk
  foreign key (payment_id) references public.payments(id) on delete set null;

-- ============================ TRIGGERS =================================
drop trigger if exists trg_patients_updated_at on public.patients;
create trigger trg_patients_updated_at before update on public.patients
  for each row execute function public.set_updated_at();

drop trigger if exists trg_commissions_updated_at on public.commissions;
create trigger trg_commissions_updated_at before update on public.commissions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_technologies_updated_at on public.technologies;
create trigger trg_technologies_updated_at before update on public.technologies
  for each row execute function public.set_updated_at();

drop trigger if exists trg_platforms_updated_at on public.platforms;
create trigger trg_platforms_updated_at before update on public.platforms
  for each row execute function public.set_updated_at();

drop trigger if exists trg_cities_updated_at on public.cities;
create trigger trg_cities_updated_at before update on public.cities
  for each row execute function public.set_updated_at();

drop trigger if exists trg_locations_updated_at on public.locations;
create trigger trg_locations_updated_at before update on public.locations
  for each row execute function public.set_updated_at();

-- Cuando una venta se marca como cerrada → crear comisión 10% automática
create or replace function public.on_sale_closed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  pro_id uuid;
  base_amount numeric(14,2);
  commission_amount numeric(14,2);
begin
  if (new.sale_closed is true and (old.sale_closed is null or old.sale_closed is false)) then
    pro_id := coalesce(new.assigned_professional_id, new.professional_id);
    base_amount := coalesce(new.total_price, 0);
    commission_amount := round(base_amount * 0.10, 2);

    new.sale_closed_at := coalesce(new.sale_closed_at, now());
    new.sale_status := 'closed';
    new.funnel_status := 'sale_closed';

    insert into public.commissions (
      patient_id, professional_id, sale_amount, amount, status, generated_at
    ) values (
      new.id, pro_id, base_amount, commission_amount, 'pending', now()
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_on_sale_closed on public.patients;
create trigger trg_on_sale_closed before update on public.patients
  for each row execute function public.on_sale_closed();

-- ============================ GRANTS ===================================
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;

-- ============================ RLS ======================================
alter table public.technologies enable row level security;
alter table public.platforms enable row level security;
alter table public.cities enable row level security;
alter table public.locations enable row level security;
alter table public.patient_origins enable row level security;
alter table public.patients enable row level security;
alter table public.patient_notes enable row level security;
alter table public.patient_followups enable row level security;
alter table public.medical_reports enable row level security;
alter table public.commissions enable row level security;
alter table public.payments enable row level security;

-- CATÁLOGOS: read para todos los aprobados; write solo admin
do $$
declare t text;
begin
  foreach t in array array['technologies','platforms','cities','locations','patient_origins']
  loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s;', t);
    execute format($q$create policy "%1$s_read" on public.%1$s for select to authenticated using (public.is_approved(auth.uid()))$q$, t);
    execute format('drop policy if exists "%1$s_admin_all" on public.%1$s;', t);
    execute format($q$create policy "%1$s_admin_all" on public.%1$s for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()))$q$, t);
  end loop;
end $$;

-- PATIENTS: cada profesional ve solo los suyos; admin ve todos
drop policy if exists "patients_owner_all" on public.patients;
create policy "patients_owner_all" on public.patients
  for all to authenticated
  using (
    deleted_at is null
    and (professional_id = auth.uid() or assigned_professional_id = auth.uid())
    and public.is_approved(auth.uid())
  )
  with check (
    professional_id = auth.uid() or assigned_professional_id = auth.uid()
  );

drop policy if exists "patients_admin_all" on public.patients;
create policy "patients_admin_all" on public.patients
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Notas y seguimientos heredan acceso del paciente
drop policy if exists "patient_notes_access" on public.patient_notes;
create policy "patient_notes_access" on public.patient_notes
  for all to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.patients p
      where p.id = patient_notes.patient_id
        and (p.professional_id = auth.uid() or p.assigned_professional_id = auth.uid())
    )
  )
  with check (author_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "patient_followups_access" on public.patient_followups;
create policy "patient_followups_access" on public.patient_followups
  for all to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.patients p
      where p.id = patient_followups.patient_id
        and (p.professional_id = auth.uid() or p.assigned_professional_id = auth.uid())
    )
  )
  with check (author_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "medical_reports_access" on public.medical_reports;
create policy "medical_reports_access" on public.medical_reports
  for all to authenticated
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.patients p
      where p.id = medical_reports.patient_id
        and (p.professional_id = auth.uid() or p.assigned_professional_id = auth.uid())
    )
  )
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.patients p
      where p.id = medical_reports.patient_id
        and (p.professional_id = auth.uid() or p.assigned_professional_id = auth.uid())
    )
  );

-- Comisiones: el profesional ve las suyas; admin todas; solo admin escribe
drop policy if exists "commissions_owner_read" on public.commissions;
create policy "commissions_owner_read" on public.commissions
  for select to authenticated using (
    professional_id = auth.uid() or public.is_admin(auth.uid())
  );

drop policy if exists "commissions_admin_write" on public.commissions;
create policy "commissions_admin_write" on public.commissions
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Pagos: el profesional ve los suyos; solo admin escribe
drop policy if exists "payments_owner_read" on public.payments;
create policy "payments_owner_read" on public.payments
  for select to authenticated using (
    professional_id = auth.uid() or public.is_admin(auth.uid())
  );

drop policy if exists "payments_admin_write" on public.payments;
create policy "payments_admin_write" on public.payments
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ============================ SEEDS ====================================
insert into public.technologies (name, sort_order) values
  ('Evoke', 1), ('Magnify', 2), ('Moment', 3), ('Smart-RIC', 4), ('Allure', 5)
on conflict (name) do nothing;

insert into public.platforms (code, sort_order) values
  ('30', 1), ('50', 2), ('100', 3), ('110', 4), ('220', 5), ('330', 6), ('440', 7)
on conflict (code) do nothing;

insert into public.cities (name) values
  ('Bogotá'), ('Medellín'), ('Cali'), ('Barranquilla'), ('Bucaramanga'),
  ('Cartagena'), ('Pereira'), ('Manizales'), ('Cúcuta'), ('Ibagué')
on conflict (name) do nothing;

insert into public.patient_origins (name) values
  ('Visita médica'), ('Referido'), ('Marketing digital'), ('Llamada directa'),
  ('Punto de venta'), ('Evento'), ('Otro')
on conflict (name) do nothing;
