-- =====================================================================
-- Wholesale F5 · La venta se describe con tres ejes independientes:
--   lateralidad     binaural | unilateral   (columna binaural)
--   alimentación    recargable | batería    (columna rechargeable)
--   estilo          RIC | BTE | intracanal  (columna style, nueva)
-- =====================================================================

create table if not exists public.wholesale_product_styles (
  slug text primary key,
  label text not null,
  description text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.wholesale_product_styles (slug, label, description, sort_order) values
  ('ric',        'RIC',        'Receptor en el canal',        10),
  ('bte',        'BTE',        'Retroauricular',              20),
  ('intracanal', 'Intracanal', 'ITC, ITE, CIC y similares',   30)
on conflict (slug) do nothing;

alter table public.wholesale_sales
  add column if not exists style text references public.wholesale_product_styles(slug);

create index if not exists wholesale_sales_style_idx
  on public.wholesale_sales(style) where deleted_at is null;

drop trigger if exists trg_wholesale_product_styles_updated_at on public.wholesale_product_styles;
create trigger trg_wholesale_product_styles_updated_at before update on public.wholesale_product_styles
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.wholesale_product_styles to authenticated;
alter table public.wholesale_product_styles enable row level security;

drop policy if exists "wholesale_product_styles_read" on public.wholesale_product_styles;
create policy "wholesale_product_styles_read" on public.wholesale_product_styles
  for select to authenticated
  using (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_rep(auth.uid()));

drop policy if exists "wholesale_product_styles_write" on public.wholesale_product_styles;
create policy "wholesale_product_styles_write" on public.wholesale_product_styles
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));
