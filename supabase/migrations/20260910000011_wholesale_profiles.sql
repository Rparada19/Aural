-- =====================================================================
-- Wholesale F9 · Perfil del comercial
-- Se separa lo que describe a la persona (y ella mantiene) de lo que
-- define su rol en el canal (y solo coordinación decide).
-- =====================================================================

alter table public.wholesale_reps
  -- Lo mantiene la propia persona
  add column if not exists photo_url text,
  add column if not exists mobile text,
  add column if not exists city text,
  add column if not exists bio text,
  -- Lo define coordinación
  add column if not exists job_title text,
  add column if not exists document_id text,
  add column if not exists started_on date,
  add column if not exists territory_note text;

comment on column public.wholesale_reps.zone is
  'Territorio asignado. Solo coordinación lo cambia: de él dependen cartera, presupuesto y comisiones.';
comment on column public.wholesale_reps.is_active is
  'Baja lógica. Solo coordinación. Un comercial inactivo conserva su histórico.';

-- Foto de perfil: bucket propio, lectura para el mercado
insert into storage.buckets (id, name, public)
values ('wholesale-avatars', 'wholesale-avatars', false)
on conflict (id) do nothing;

drop policy if exists "wholesale_avatars_read" on storage.objects;
create policy "wholesale_avatars_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wholesale-avatars'
    and (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_rep(auth.uid()))
  );

drop policy if exists "wholesale_avatars_write" on storage.objects;
create policy "wholesale_avatars_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wholesale-avatars'
    and (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_rep(auth.uid()))
  );

drop policy if exists "wholesale_avatars_update" on storage.objects;
create policy "wholesale_avatars_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'wholesale-avatars'
    and (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_rep(auth.uid()))
  );

-- El comercial puede actualizar SU ficha. Que no cambie zona ni estado
-- se garantiza en la capa de aplicación, que solo envía los campos
-- personales; la política deja pasar la fila, no el criterio de negocio.
drop policy if exists "wholesale_reps_self_update" on public.wholesale_reps;
create policy "wholesale_reps_self_update" on public.wholesale_reps
  for update to authenticated
  using (public.is_wholesale_rep(auth.uid()) and id = public.wholesale_rep_id(auth.uid()))
  with check (public.is_wholesale_rep(auth.uid()) and id = public.wholesale_rep_id(auth.uid()));

-- Cinturón y tirantes: un disparador impide que la zona o el estado
-- cambien si quien edita no es coordinación, venga de donde venga.
create or replace function public.wholesale_reps_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_wholesale_coordinator(auth.uid()) then
    return new;
  end if;
  if new.zone is distinct from old.zone
     or new.is_active is distinct from old.is_active
     or new.job_title is distinct from old.job_title
     or new.started_on is distinct from old.started_on
     or new.document_id is distinct from old.document_id then
    raise exception 'Solo coordinación puede cambiar zona, estado, cargo, ingreso o documento';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_wholesale_reps_guard on public.wholesale_reps;
create trigger trg_wholesale_reps_guard before update on public.wholesale_reps
  for each row execute function public.wholesale_reps_guard();
