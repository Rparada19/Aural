-- =====================================================================
-- Wholesale F10 · Celebraciones
--   · Contactos de cada centro, con su cumpleaños.
--   · Fechas del gremio: día del audiólogo, fonoaudiólogo, madre, padre.
--   · Plantillas y registro de lo enviado, para no repetir ni olvidar.
-- =====================================================================

-- ============================= CONTACTOS ==============================
create table if not exists public.wholesale_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.wholesale_clients(id) on delete cascade,
  name text not null,
  role text,
  email citext,
  phone text,
  -- Solo mes y día importan para felicitar; el año es opcional
  birth_month integer check (birth_month between 1 and 12),
  birth_day integer check (birth_day between 1 and 31),
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists wholesale_contacts_client_idx
  on public.wholesale_contacts(client_id) where deleted_at is null;
create index if not exists wholesale_contacts_birthday_idx
  on public.wholesale_contacts(birth_month, birth_day) where deleted_at is null;

-- ========================== FECHAS DEL AÑO ============================
create table if not exists public.wholesale_celebrations (
  slug text primary key,
  label text not null,
  month integer not null check (month between 1 and 12),
  day integer not null check (day between 1 and 31),
  -- A quién aplica: todo el canal o solo cierto perfil de contacto
  audience text not null default 'todos',
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.wholesale_celebrations (slug, label, month, day, audience, note) values
  ('dia_audiologo',      'Día del Audiólogo',       11, 10, 'audiologos',    'Fecha del gremio'),
  ('dia_fonoaudiologo',  'Día del Fonoaudiólogo',    8, 22, 'fonoaudiologos','Fecha del gremio'),
  ('dia_madre',          'Día de la Madre',          5, 10, 'todos',         'Segundo domingo de mayo en Colombia; se ajusta cada año'),
  ('dia_padre',          'Día del Padre',            6, 21, 'todos',         'Tercer domingo de junio; se ajusta cada año'),
  ('dia_mujer',          'Día de la Mujer',          3,  8, 'todos',         null),
  ('navidad',            'Navidad',                 12, 24, 'todos',         null),
  ('ano_nuevo',          'Año Nuevo',                1,  1, 'todos',         null)
on conflict (slug) do nothing;

-- ============================ PLANTILLAS ==============================
create table if not exists public.wholesale_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'celebracion',
  subject text,
  body text not null,
  -- Para las plantillas atadas a una fecha del calendario
  celebration_slug text references public.wholesale_celebrations(slug),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

insert into public.wholesale_templates (name, kind, subject, body, celebration_slug)
select 'Cumpleaños', 'cumpleanos', '¡Feliz cumpleaños, {{nombre}}!',
E'Hola {{nombre}},\n\nDe parte de todo el equipo de Aural queremos desearte un feliz cumpleaños. Gracias por confiar en nosotros para acompañar a tus pacientes.\n\nQue tengas un año lleno de logros.\n\nEquipo Aural', null
where not exists (select 1 from public.wholesale_templates where kind = 'cumpleanos');

-- ======================== REGISTRO DE ENVÍOS ==========================
create table if not exists public.wholesale_sends (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.wholesale_contacts(id) on delete set null,
  client_id uuid references public.wholesale_clients(id) on delete set null,
  template_id uuid references public.wholesale_templates(id) on delete set null,
  celebration_slug text references public.wholesale_celebrations(slug),
  -- Año al que corresponde el saludo: evita felicitar dos veces
  year integer not null,
  channel text not null default 'email',
  status text not null default 'pending',
  subject text,
  body text,
  error text,
  sent_by uuid references public.profiles(id),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists wholesale_sends_lookup_idx
  on public.wholesale_sends(contact_id, celebration_slug, year);
create index if not exists wholesale_sends_recent_idx
  on public.wholesale_sends(created_at desc);

-- ============================== TRIGGERS ==============================
drop trigger if exists trg_wholesale_contacts_updated_at on public.wholesale_contacts;
create trigger trg_wholesale_contacts_updated_at before update on public.wholesale_contacts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_wholesale_templates_updated_at on public.wholesale_templates;
create trigger trg_wholesale_templates_updated_at before update on public.wholesale_templates
  for each row execute function public.set_updated_at();

-- ================================ RLS =================================
grant select, insert, update, delete on public.wholesale_contacts to authenticated;
grant select, insert, update, delete on public.wholesale_celebrations to authenticated;
grant select, insert, update, delete on public.wholesale_templates to authenticated;
grant select, insert, update, delete on public.wholesale_sends to authenticated;

alter table public.wholesale_contacts enable row level security;
alter table public.wholesale_celebrations enable row level security;
alter table public.wholesale_templates enable row level security;
alter table public.wholesale_sends enable row level security;

-- Contactos: coordinación todo; el comercial los de su cartera
drop policy if exists "wholesale_contacts_coordinator" on public.wholesale_contacts;
create policy "wholesale_contacts_coordinator" on public.wholesale_contacts
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_contacts_rep" on public.wholesale_contacts;
create policy "wholesale_contacts_rep" on public.wholesale_contacts
  for all to authenticated
  using (
    public.is_wholesale_rep(auth.uid())
    and exists (
      select 1 from public.wholesale_clients c
      where c.id = wholesale_contacts.client_id
        and c.rep_id = public.wholesale_rep_id(auth.uid())
    )
  )
  with check (
    public.is_wholesale_rep(auth.uid())
    and exists (
      select 1 from public.wholesale_clients c
      where c.id = wholesale_contacts.client_id
        and c.rep_id = public.wholesale_rep_id(auth.uid())
    )
  );

-- Calendario y plantillas: los lee el mercado, los edita coordinación
drop policy if exists "wholesale_celebrations_read" on public.wholesale_celebrations;
create policy "wholesale_celebrations_read" on public.wholesale_celebrations
  for select to authenticated
  using (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_rep(auth.uid()));

drop policy if exists "wholesale_celebrations_write" on public.wholesale_celebrations;
create policy "wholesale_celebrations_write" on public.wholesale_celebrations
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_templates_read" on public.wholesale_templates;
create policy "wholesale_templates_read" on public.wholesale_templates
  for select to authenticated
  using (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_rep(auth.uid()));

drop policy if exists "wholesale_templates_write" on public.wholesale_templates;
create policy "wholesale_templates_write" on public.wholesale_templates
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

-- Envíos: cada quien registra los suyos; coordinación ve todo
drop policy if exists "wholesale_sends_coordinator" on public.wholesale_sends;
create policy "wholesale_sends_coordinator" on public.wholesale_sends
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_sends_rep" on public.wholesale_sends;
create policy "wholesale_sends_rep" on public.wholesale_sends
  for all to authenticated
  using (
    public.is_wholesale_rep(auth.uid())
    and exists (
      select 1 from public.wholesale_clients c
      where c.id = wholesale_sends.client_id
        and c.rep_id = public.wholesale_rep_id(auth.uid())
    )
  )
  with check (
    public.is_wholesale_rep(auth.uid())
    and exists (
      select 1 from public.wholesale_clients c
      where c.id = wholesale_sends.client_id
        and c.rep_id = public.wholesale_rep_id(auth.uid())
    )
  );
