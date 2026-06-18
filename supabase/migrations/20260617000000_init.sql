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
