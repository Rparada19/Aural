-- =====================================================================
-- Wholesale F6.1 · Nombre de campaña en la venta
-- Texto libre: las campañas del canal mayorista se nombran sobre la
-- marcha y no viven en marketing_campaigns, que es de visita médica.
-- =====================================================================

alter table public.wholesale_sales
  add column if not exists campaign_name text;

create index if not exists wholesale_sales_campaign_idx
  on public.wholesale_sales(campaign_name) where deleted_at is null and campaign_name is not null;
