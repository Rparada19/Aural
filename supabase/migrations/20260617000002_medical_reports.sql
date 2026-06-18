-- =====================================================================
-- Aural · F4 · Informes médicos extendidos + storage bucket + reads
-- =====================================================================

-- Extender medical_reports con campos de exámenes y cuerpo IA
alter table public.medical_reports
  add column if not exists audiometry_url text,
  add column if not exists logoaudiometry_url text,
  add column if not exists otoscopy_description text,
  add column if not exists ai_body text,
  add column if not exists generated_at timestamptz;

-- Tracking de lecturas por usuario
create table if not exists public.medical_report_reads (
  medical_report_id uuid not null references public.medical_reports(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (medical_report_id, user_id)
);

alter table public.medical_report_reads enable row level security;

drop policy if exists "report_reads_self" on public.medical_report_reads;
create policy "report_reads_self" on public.medical_report_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "report_reads_admin" on public.medical_report_reads;
create policy "report_reads_admin" on public.medical_report_reads
  for select to authenticated using (public.is_admin(auth.uid()));

-- Bucket de storage
insert into storage.buckets (id, name, public)
values ('medical-exams', 'medical-exams', false)
on conflict (id) do nothing;

-- Políticas storage: admin sube; profesional dueño del paciente puede leer
drop policy if exists "medexams_admin_write" on storage.objects;
create policy "medexams_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'medical-exams' and public.is_admin(auth.uid()));

drop policy if exists "medexams_admin_update" on storage.objects;
create policy "medexams_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'medical-exams' and public.is_admin(auth.uid()));

drop policy if exists "medexams_read" on storage.objects;
create policy "medexams_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'medical-exams');

-- Grants
grant select, insert, update, delete on public.medical_report_reads to authenticated;
