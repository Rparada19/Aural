-- =====================================================================
-- F14 · Roles de staff Aural + link visitador↔usuario
-- =====================================================================

do $$ begin
  create type admin_role as enum ('coordinator','csr','visitor_rep');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists admin_role admin_role,
  add column if not exists linked_visitor_id uuid references public.visitors(id);

create index if not exists profiles_admin_role_idx on public.profiles(admin_role) where admin_role is not null;
create index if not exists profiles_linked_visitor_idx on public.profiles(linked_visitor_id) where linked_visitor_id is not null;

-- Helpers
create or replace function public.has_admin_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.profiles where id = uid),
    (select admin_role is not null from public.profiles where id = uid),
    false
  );
$$;

create or replace function public.is_coordinator(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.profiles where id = uid),
    (select admin_role = 'coordinator' from public.profiles where id = uid),
    false
  );
$$;

create or replace function public.is_csr(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select admin_role = 'csr' from public.profiles where id = uid), false);
$$;

create or replace function public.is_visitor_rep(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select admin_role = 'visitor_rep' from public.profiles where id = uid), false);
$$;

create or replace function public.visitor_rep_id(uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select linked_visitor_id from public.profiles where id = uid;
$$;

-- Actualizar policies de patients para CSR (ven todo) y visitor_rep (sus médicos)
drop policy if exists "patients_csr_all" on public.patients;
create policy "patients_csr_all" on public.patients
  for all to authenticated
  using (public.is_csr(auth.uid()))
  with check (public.is_csr(auth.uid()));

drop policy if exists "patients_visitor_rep_read" on public.patients;
create policy "patients_visitor_rep_read" on public.patients
  for select to authenticated
  using (
    public.is_visitor_rep(auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = patients.professional_id
        and p.visitor_id = public.visitor_rep_id(auth.uid())
    )
  );

-- CSR puede notas/seguimientos/informes
drop policy if exists "notes_csr" on public.patient_notes;
create policy "notes_csr" on public.patient_notes
  for all to authenticated using (public.is_csr(auth.uid())) with check (public.is_csr(auth.uid()));

drop policy if exists "followups_csr" on public.patient_followups;
create policy "followups_csr" on public.patient_followups
  for all to authenticated using (public.is_csr(auth.uid())) with check (public.is_csr(auth.uid()));

drop policy if exists "reports_csr" on public.medical_reports;
create policy "reports_csr" on public.medical_reports
  for all to authenticated using (public.is_csr(auth.uid())) with check (public.is_csr(auth.uid()));

-- Visitor_rep ve commissions/payments de sus médicos
drop policy if exists "commissions_visitor_rep_read" on public.commissions;
create policy "commissions_visitor_rep_read" on public.commissions
  for select to authenticated
  using (
    public.is_visitor_rep(auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = commissions.professional_id
        and p.visitor_id = public.visitor_rep_id(auth.uid())
    )
  );

drop policy if exists "payments_visitor_rep_read" on public.payments;
create policy "payments_visitor_rep_read" on public.payments
  for select to authenticated
  using (
    public.is_visitor_rep(auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = payments.professional_id
        and p.visitor_id = public.visitor_rep_id(auth.uid())
    )
  );
