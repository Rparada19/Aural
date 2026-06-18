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
