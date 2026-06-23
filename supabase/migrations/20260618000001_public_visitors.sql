-- Permitir que usuarios anónimos (durante el registro) lean visitadores activos
drop policy if exists "visitors_public_read" on public.visitors;
create policy "visitors_public_read" on public.visitors
  for select to anon, authenticated
  using (is_active = true and deleted_at is null);

grant select on public.visitors to anon;
