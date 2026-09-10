-- =====================================================================
-- Wholesale F6 · Plataforma y nivel de tecnología en la venta
-- El "estilo" pasa a llamarse formato en la interfaz; en base sigue
-- siendo wholesale_product_styles para no romper lo ya cargado.
-- =====================================================================

create table if not exists public.wholesale_platforms (
  slug text primary key,
  label text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.wholesale_platforms (slug, label, sort_order) values
  ('evoke',     'Evoke',     10),
  ('magnify',   'Magnify',   20),
  ('moment',    'Moment',    30),
  ('smart_ric', 'Smart RIC', 40),
  ('allure',    'Allure',    50)
on conflict (slug) do nothing;

create table if not exists public.wholesale_tech_levels (
  slug text primary key,
  label text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.wholesale_tech_levels (slug, label, sort_order) values
  ('30',  '30',  10),
  ('50',  '50',  20),
  ('100', '100', 30),
  ('110', '110', 40),
  ('220', '220', 50),
  ('330', '330', 60),
  ('440', '440', 70)
on conflict (slug) do nothing;

alter table public.wholesale_sales
  add column if not exists platform text references public.wholesale_platforms(slug),
  add column if not exists tech_level text references public.wholesale_tech_levels(slug);

create index if not exists wholesale_sales_platform_idx
  on public.wholesale_sales(platform) where deleted_at is null;
create index if not exists wholesale_sales_tech_idx
  on public.wholesale_sales(tech_level) where deleted_at is null;

drop trigger if exists trg_wholesale_platforms_updated_at on public.wholesale_platforms;
create trigger trg_wholesale_platforms_updated_at before update on public.wholesale_platforms
  for each row execute function public.set_updated_at();

drop trigger if exists trg_wholesale_tech_levels_updated_at on public.wholesale_tech_levels;
create trigger trg_wholesale_tech_levels_updated_at before update on public.wholesale_tech_levels
  for each row execute function public.set_updated_at();

-- ================================ RLS =================================
grant select, insert, update, delete on public.wholesale_platforms to authenticated;
grant select, insert, update, delete on public.wholesale_tech_levels to authenticated;

alter table public.wholesale_platforms enable row level security;
alter table public.wholesale_tech_levels enable row level security;

drop policy if exists "wholesale_platforms_read" on public.wholesale_platforms;
create policy "wholesale_platforms_read" on public.wholesale_platforms
  for select to authenticated
  using (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_rep(auth.uid()));

drop policy if exists "wholesale_platforms_write" on public.wholesale_platforms;
create policy "wholesale_platforms_write" on public.wholesale_platforms
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_tech_levels_read" on public.wholesale_tech_levels;
create policy "wholesale_tech_levels_read" on public.wholesale_tech_levels
  for select to authenticated
  using (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_rep(auth.uid()));

drop policy if exists "wholesale_tech_levels_write" on public.wholesale_tech_levels;
create policy "wholesale_tech_levels_write" on public.wholesale_tech_levels
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));
