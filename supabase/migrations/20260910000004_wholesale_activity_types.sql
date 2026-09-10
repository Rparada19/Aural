-- =====================================================================
-- Wholesale F3.1 · Los tipos de actividad dejan de ser un enum fijo
-- y pasan a un catálogo que administración puede ampliar.
-- =====================================================================

create table if not exists public.wholesale_activity_types (
  slug text primary key,
  label text not null,
  icon text not null default '📌',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.wholesale_activity_types (slug, label, icon, sort_order) values
  ('presencial',   'Visita presencial', '🤝', 10),
  ('virtual',      'Visita virtual',    '💻', 20),
  ('viaje',        'Viaje',             '✈️', 30),
  ('capacitacion', 'Capacitación',      '🎓', 40),
  ('jornada',      'Jornada',           '📣', 50),
  ('llamada',      'Llamada',           '📞', 60),
  ('whatsapp',     'WhatsApp',          '💬', 70)
on conflict (slug) do nothing;

-- El enum se vuelve texto para que el catálogo mande.
alter table public.wholesale_activities
  alter column kind type text using kind::text;

alter table public.wholesale_activity_targets
  alter column kind type text using kind::text;

do $$ begin
  alter table public.wholesale_activities
    add constraint wholesale_activities_kind_fkey
    foreign key (kind) references public.wholesale_activity_types(slug);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.wholesale_activity_targets
    add constraint wholesale_activity_targets_kind_fkey
    foreign key (kind) references public.wholesale_activity_types(slug);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_wholesale_activity_types_updated_at on public.wholesale_activity_types;
create trigger trg_wholesale_activity_types_updated_at before update on public.wholesale_activity_types
  for each row execute function public.set_updated_at();

-- ================================ RLS =================================
grant select, insert, update, delete on public.wholesale_activity_types to authenticated;
alter table public.wholesale_activity_types enable row level security;

-- Todo el mercado lee el catálogo; solo coordinación lo modifica.
drop policy if exists "wholesale_activity_types_read" on public.wholesale_activity_types;
create policy "wholesale_activity_types_read" on public.wholesale_activity_types
  for select to authenticated
  using (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_rep(auth.uid()));

drop policy if exists "wholesale_activity_types_write" on public.wholesale_activity_types;
create policy "wholesale_activity_types_write" on public.wholesale_activity_types
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));
