-- Auto-asignar visitor al profile cuando el médico se registra desde mobile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (
    id, full_name, cedula, email, phone, city, profession, address, role, specialty, status, visitor_id
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
    'pending',
    nullif(m->>'visitor_id','')::uuid
  );
  return new;
end $$;

-- Visitor_rep también necesita poder leer su perfil
-- (ya cubierto por profiles_self_read)
