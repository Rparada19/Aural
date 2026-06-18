-- ============================================================
-- 20260617000000_init.sql
-- ============================================================
-- =====================================================================
-- Aural · Migración inicial
-- Profiles + Roles + Approval flow + Content + Audit
-- =====================================================================

-- Extensiones
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ============================ ENUMS ===================================
do $$ begin
  create type role_slug as enum (
    'otorrino','audiologo','crc','otro_profesional','funcionario_aural'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type otorrino_specialty as enum (
    'otologo','neuro_otologo','laringologo','rinologo'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type profile_status as enum ('pending','approved','rejected','suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_type as enum ('news','video','event','document');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_status as enum ('draft','scheduled','published','archived');
exception when duplicate_object then null; end $$;

-- ============================ PROFILES =================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  cedula text not null unique,
  email citext not null unique,
  phone text not null,
  city text not null,
  profession text not null,
  address text not null,
  role role_slug not null,
  specialty otorrino_specialty,
  status profile_status not null default 'pending',
  is_admin boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists profiles_status_idx on public.profiles(status) where deleted_at is null;
create index if not exists profiles_role_idx on public.profiles(role) where deleted_at is null;
create index if not exists profiles_city_idx on public.profiles(city) where deleted_at is null;
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);

-- ============================ CONTENT ==================================
create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  type content_type not null,
  title text not null,
  body text,
  media_url text,
  thumbnail_url text,
  status content_status not null default 'draft',
  publish_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists content_type_idx on public.content(type) where deleted_at is null;
create index if not exists content_status_idx on public.content(status) where deleted_at is null;
create index if not exists content_publish_at_idx on public.content(publish_at desc) where deleted_at is null;

create table if not exists public.content_audiences (
  content_id uuid not null references public.content(id) on delete cascade,
  role role_slug not null,
  primary key (content_id, role)
);

-- Detalles específicos por tipo
create table if not exists public.events (
  content_id uuid primary key references public.content(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text
);

create table if not exists public.videos (
  content_id uuid primary key references public.content(id) on delete cascade,
  video_url text not null,
  duration_seconds integer
);

create table if not exists public.documents (
  content_id uuid primary key references public.content(id) on delete cascade,
  file_url text not null,
  mime_type text,
  size_bytes integer
);

-- ============================ NOTIFICATIONS ============================
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios','android','web')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid references public.content(id) on delete set null,
  channel text not null check (channel in ('push','email','inapp')),
  title text not null,
  body text,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ============================ AUDIT LOGS ===============================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id text,
  diff jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on public.audit_logs(entity, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id, created_at desc);

-- ============================ TRIGGERS =================================
-- Mantener updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_content_updated_at on public.content;
create trigger trg_content_updated_at before update on public.content
  for each row execute function public.set_updated_at();

-- Al crear un usuario en auth.users, crear su profile con metadata
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (
    id, full_name, cedula, email, phone, city, profession, address, role, specialty, status
  ) values (
    new.id,
    coalesce(m->>'full_name',''),
    coalesce(m->>'cedula',''),
    new.email,
    coalesce(m->>'phone',''),
    coalesce(m->>'city',''),
    coalesce(m->>'profession',''),
    coalesce(m->>'address',''),
    coalesce((m->>'role')::role_slug, 'otro_profesional'),
    nullif(m->>'specialty','')::otorrino_specialty,
    'pending'
  );
  return new;
end $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================ HELPERS ==================================
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

create or replace function public.is_approved(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'approved' from public.profiles where id = uid), false);
$$;

create or replace function public.user_role(uid uuid)
returns role_slug language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = uid;
$$;

-- ============================ GRANTS ===================================
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;

-- ============================ ROW LEVEL SECURITY =======================
alter table public.profiles enable row level security;
alter table public.content enable row level security;
alter table public.content_audiences enable row level security;
alter table public.events enable row level security;
alter table public.videos enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.audit_logs enable row level security;

-- PROFILES
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- CONTENT: aprobados ven el contenido publicado dirigido a su rol
drop policy if exists "content_audience_read" on public.content;
create policy "content_audience_read" on public.content
  for select to authenticated using (
    deleted_at is null
    and status = 'published'
    and public.is_approved(auth.uid())
    and exists (
      select 1 from public.content_audiences ca
      where ca.content_id = content.id and ca.role = public.user_role(auth.uid())
    )
  );

drop policy if exists "content_admin_all" on public.content;
create policy "content_admin_all" on public.content
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Audiences readable a través de content; gestionables solo por admin
drop policy if exists "audiences_admin_all" on public.content_audiences;
create policy "audiences_admin_all" on public.content_audiences
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "audiences_read" on public.content_audiences;
create policy "audiences_read" on public.content_audiences
  for select to authenticated using (role = public.user_role(auth.uid()));

-- Detalles por tipo: heredan via content
drop policy if exists "events_admin_all" on public.events;
create policy "events_admin_all" on public.events
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "events_read" on public.events;
create policy "events_read" on public.events
  for select to authenticated using (
    exists (select 1 from public.content c where c.id = events.content_id and c.status = 'published')
  );

drop policy if exists "videos_admin_all" on public.videos;
create policy "videos_admin_all" on public.videos
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "videos_read" on public.videos;
create policy "videos_read" on public.videos
  for select to authenticated using (
    exists (select 1 from public.content c where c.id = videos.content_id and c.status = 'published')
  );

drop policy if exists "documents_admin_all" on public.documents;
create policy "documents_admin_all" on public.documents
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "documents_read" on public.documents;
create policy "documents_read" on public.documents
  for select to authenticated using (
    exists (select 1 from public.content c where c.id = documents.content_id and c.status = 'published')
  );

-- Notifications: solo el dueño y admin
drop policy if exists "notifications_self_read" on public.notifications;
create policy "notifications_self_read" on public.notifications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "notifications_self_update" on public.notifications;
create policy "notifications_self_update" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications_admin_all" on public.notifications;
create policy "notifications_admin_all" on public.notifications
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Push tokens: solo el dueño
drop policy if exists "push_tokens_self_all" on public.push_tokens;
create policy "push_tokens_self_all" on public.push_tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Audit logs: solo admins lectura
drop policy if exists "audit_admin_read" on public.audit_logs;
create policy "audit_admin_read" on public.audit_logs
  for select to authenticated using (public.is_admin(auth.uid()));

-- ============================================================
-- 20260617000001_crm_patients.sql
-- ============================================================
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

-- ============================================================
-- 20260617000002_medical_reports.sql
-- ============================================================
-- =====================================================================
-- Aural · F4 · Informes médicos extendidos + storage bucket + reads
-- =====================================================================

-- Extender medical_reports con campos de exámenes y cuerpo IA
alter table public.medical_reports
  add column if not exists audiometry_url text,
  add column if not exists logoaudiometry_url text,
  add column if not exists otoscopy_description text,
  add column if not exists ai_body text,
  add column if not exists generated_at timestamptz;

-- Tracking de lecturas por usuario
create table if not exists public.medical_report_reads (
  medical_report_id uuid not null references public.medical_reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (medical_report_id, user_id)
);

alter table public.medical_report_reads enable row level security;

drop policy if exists "report_reads_self" on public.medical_report_reads;
create policy "report_reads_self" on public.medical_report_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "report_reads_admin" on public.medical_report_reads;
create policy "report_reads_admin" on public.medical_report_reads
  for select to authenticated using (public.is_admin(auth.uid()));

-- Bucket de storage
insert into storage.buckets (id, name, public)
values ('medical-exams', 'medical-exams', false)
on conflict (id) do nothing;

-- Políticas storage: admin sube; profesional dueño del paciente puede leer
drop policy if exists "medexams_admin_write" on storage.objects;
create policy "medexams_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'medical-exams' and public.is_admin(auth.uid()));

drop policy if exists "medexams_admin_update" on storage.objects;
create policy "medexams_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'medical-exams' and public.is_admin(auth.uid()));

drop policy if exists "medexams_read" on storage.objects;
create policy "medexams_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'medical-exams');

-- Grants
grant select, insert, update, delete on public.medical_report_reads to authenticated;

-- ============================================================
-- 20260617000003_payments_bucket.sql
-- ============================================================
-- Bucket para comprobantes de pago
insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts_admin_write" on storage.objects;
create policy "receipts_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-receipts' and public.is_admin(auth.uid()));

drop policy if exists "receipts_admin_update" on storage.objects;
create policy "receipts_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'payment-receipts' and public.is_admin(auth.uid()));

drop policy if exists "receipts_read" on storage.objects;
create policy "receipts_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-receipts');

-- ============================================================
-- 20260617000004_reports_nullable.sql
-- ============================================================
-- file_url se vuelve opcional: ahora hay informes basados en imágenes + IA sin PDF subido
alter table public.medical_reports alter column file_url drop not null;

-- ============================================================
-- 20260617000005_visitors_audiologists.sql
-- ============================================================
-- =====================================================================
-- Aural · F7 · Visitadores médicos + Audiólogos por sede
-- =====================================================================

create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email citext,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.audiologists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email citext,
  location_id uuid references public.locations(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.patients
  add column if not exists visitor_id uuid references public.visitors(id),
  add column if not exists audiologist_id uuid references public.audiologists(id);

create index if not exists patients_visitor_idx on public.patients(visitor_id) where deleted_at is null;
create index if not exists patients_audiologist_idx on public.patients(audiologist_id) where deleted_at is null;

drop trigger if exists trg_visitors_updated_at on public.visitors;
create trigger trg_visitors_updated_at before update on public.visitors
  for each row execute function public.set_updated_at();

drop trigger if exists trg_audiologists_updated_at on public.audiologists;
create trigger trg_audiologists_updated_at before update on public.audiologists
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.visitors to authenticated;
grant select, insert, update, delete on public.audiologists to authenticated;

alter table public.visitors enable row level security;
alter table public.audiologists enable row level security;

drop policy if exists "visitors_read" on public.visitors;
create policy "visitors_read" on public.visitors
  for select to authenticated using (public.is_approved(auth.uid()));
drop policy if exists "visitors_admin_all" on public.visitors;
create policy "visitors_admin_all" on public.visitors
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "audiologists_read" on public.audiologists;
create policy "audiologists_read" on public.audiologists
  for select to authenticated using (public.is_approved(auth.uid()));
drop policy if exists "audiologists_admin_all" on public.audiologists;
create policy "audiologists_admin_all" on public.audiologists
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ============================================================
-- 20260617000006_visitor_links_case_type.sql
-- ============================================================
-- =====================================================================
-- F8 · Visitadores: asignación a profesionales + presupuesto + tipos de caso
-- =====================================================================

do $$ begin
  create type patient_case_type as enum (
    'sale_candidate',
    'normal_hearing',
    'cerumen_removal',
    'sudden_hearing_loss',
    'other_non_sale'
  );
exception when duplicate_object then null; end $$;

alter table public.visitors
  add column if not exists monthly_budget numeric(14,2);

alter table public.profiles
  add column if not exists visitor_id uuid references public.visitors(id);

create index if not exists profiles_visitor_idx on public.profiles(visitor_id) where deleted_at is null;

alter table public.patients
  add column if not exists case_type patient_case_type not null default 'sale_candidate';

create index if not exists patients_case_type_idx on public.patients(case_type) where deleted_at is null;

-- ============================================================
-- 20260617000007_visitor_budgets.sql
-- ============================================================
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

-- ============================================================
-- 20260617000008_opportunity.sql
-- ============================================================
alter table public.patients
  add column if not exists is_opportunity boolean not null default false;

create index if not exists patients_opportunity_idx
  on public.patients(is_opportunity) where deleted_at is null and is_opportunity = true;

-- ============================================================
-- 20260617000009_content_bucket_marketing.sql
-- ============================================================
-- =====================================================================
-- F9/F10 · Storage de contenido + tabla de campañas de marketing
-- =====================================================================

-- Bucket público para portadas y media de noticias
insert into storage.buckets (id, name, public)
values ('content-media', 'content-media', true)
on conflict (id) do nothing;

drop policy if exists "content_media_admin_write" on storage.objects;
create policy "content_media_admin_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'content-media' and public.is_admin(auth.uid()));

drop policy if exists "content_media_admin_update" on storage.objects;
create policy "content_media_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'content-media' and public.is_admin(auth.uid()));

drop policy if exists "content_media_admin_delete" on storage.objects;
create policy "content_media_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'content-media' and public.is_admin(auth.uid()));

drop policy if exists "content_media_public_read" on storage.objects;
create policy "content_media_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'content-media');

-- Campañas de marketing
do $$ begin
  create type campaign_status as enum ('draft','scheduled','sent','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campaign_channel as enum ('push','email','inapp');
exception when duplicate_object then null; end $$;

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  channel campaign_channel not null default 'inapp',
  status campaign_status not null default 'draft',
  audience_roles role_slug[],
  audience_cities text[],
  audience_visitor_id uuid references public.visitors(id),
  scheduled_at timestamptz,
  sent_at timestamptz,
  opens integer not null default 0,
  clicks integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_status_idx on public.marketing_campaigns(status);
create index if not exists campaigns_scheduled_idx on public.marketing_campaigns(scheduled_at) where status = 'scheduled';

drop trigger if exists trg_campaigns_updated_at on public.marketing_campaigns;
create trigger trg_campaigns_updated_at before update on public.marketing_campaigns
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.marketing_campaigns to authenticated;

alter table public.marketing_campaigns enable row level security;

drop policy if exists "campaigns_admin" on public.marketing_campaigns;
create policy "campaigns_admin" on public.marketing_campaigns
  for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ============================================================
-- 20260617000010_lead_priority.sql
-- ============================================================
-- =====================================================================
-- F11 · Oportunidades del médico (leads desde mobile)
-- =====================================================================

do $$ begin
  create type lead_priority as enum ('alta','media','normal');
exception when duplicate_object then null; end $$;

alter table public.patients
  add column if not exists priority lead_priority,
  add column if not exists address text,
  add column if not exists city_text text,
  add column if not exists created_by_role text;

create index if not exists patients_priority_idx
  on public.patients(priority) where deleted_at is null and priority is not null;

-- cédula deja de ser obligatoria para leads del médico (puede no saberla)
alter table public.patients alter column cedula drop not null;
-- la restricción unique(professional_id, cedula) sigue valiendo cuando cedula no es null

-- ============================================================
-- 20260617000011_discount.sql
-- ============================================================
alter table public.patients
  add column if not exists discount_percent numeric(5,2) not null default 0;

