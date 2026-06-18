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
