-- =====================================================================
-- Wholesale F9.2 · Qué NO puede tocar un comercial
--   · El presupuesto lo fija coordinación: el comercial solo lo lee.
--   · En el hilo de un proyecto, cada quien borra lo suyo.
--   · Del objetivo, el comercial reporta avance; no reescribe la meta.
-- =====================================================================

-- ======================= PRESUPUESTOS: SOLO LECTURA ===================
-- Se rehace explícitamente: la de lectura ya existía, pero conviene que
-- quede constancia de que no hay ninguna de escritura para el comercial.
drop policy if exists "wholesale_budgets_rep_read" on public.wholesale_budgets;
create policy "wholesale_budgets_rep_read" on public.wholesale_budgets
  for select to authenticated
  using (
    public.is_wholesale_rep(auth.uid())
    and exists (
      select 1 from public.wholesale_clients c
      where c.id = wholesale_budgets.client_id
        and c.rep_id = public.wholesale_rep_id(auth.uid())
    )
  );

-- Lo mismo para las metas de actividad: el comercial las consulta.
drop policy if exists "wholesale_activity_targets_rep_read" on public.wholesale_activity_targets;
create policy "wholesale_activity_targets_rep_read" on public.wholesale_activity_targets
  for select to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));

-- ================== HILO: CADA QUIEN BORRA LO SUYO ====================
-- Se reemplaza la política única de FOR ALL por una por operación: el
-- comercial lee todo el hilo de sus proyectos y escribe en él, pero solo
-- modifica o borra los mensajes que escribió.
drop policy if exists "wholesale_project_notes_rep" on public.wholesale_project_notes;

create or replace function public.in_project_team(project uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wholesale_projects p
    left join public.wholesale_project_reps t on t.project_id = p.id
    where p.id = project
      and (p.rep_id = public.wholesale_rep_id(uid) or t.rep_id = public.wholesale_rep_id(uid))
  );
$$;

drop policy if exists "wholesale_project_notes_rep_read" on public.wholesale_project_notes;
create policy "wholesale_project_notes_rep_read" on public.wholesale_project_notes
  for select to authenticated
  using (
    public.is_wholesale_rep(auth.uid())
    and public.in_project_team(project_id, auth.uid())
  );

drop policy if exists "wholesale_project_notes_rep_insert" on public.wholesale_project_notes;
create policy "wholesale_project_notes_rep_insert" on public.wholesale_project_notes
  for insert to authenticated
  with check (
    public.is_wholesale_rep(auth.uid())
    and public.in_project_team(project_id, auth.uid())
    and author_id = auth.uid()
  );

drop policy if exists "wholesale_project_notes_rep_own" on public.wholesale_project_notes;
create policy "wholesale_project_notes_rep_own" on public.wholesale_project_notes
  for update to authenticated
  using (public.is_wholesale_rep(auth.uid()) and author_id = auth.uid())
  with check (public.is_wholesale_rep(auth.uid()) and author_id = auth.uid());

drop policy if exists "wholesale_project_notes_rep_delete" on public.wholesale_project_notes;
create policy "wholesale_project_notes_rep_delete" on public.wholesale_project_notes
  for delete to authenticated
  using (public.is_wholesale_rep(auth.uid()) and author_id = auth.uid());

-- Coordinación tampoco borra mensajes ajenos: modera, no reescribe.
drop policy if exists "wholesale_project_notes_coordinator" on public.wholesale_project_notes;

drop policy if exists "wholesale_project_notes_coord_read" on public.wholesale_project_notes;
create policy "wholesale_project_notes_coord_read" on public.wholesale_project_notes
  for select to authenticated
  using (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_project_notes_coord_insert" on public.wholesale_project_notes;
create policy "wholesale_project_notes_coord_insert" on public.wholesale_project_notes
  for insert to authenticated
  with check (public.is_wholesale_coordinator(auth.uid()) and author_id = auth.uid());

drop policy if exists "wholesale_project_notes_coord_own" on public.wholesale_project_notes;
create policy "wholesale_project_notes_coord_own" on public.wholesale_project_notes
  for update to authenticated
  using (public.is_wholesale_coordinator(auth.uid()) and author_id = auth.uid())
  with check (public.is_wholesale_coordinator(auth.uid()) and author_id = auth.uid());

drop policy if exists "wholesale_project_notes_coord_delete" on public.wholesale_project_notes;
create policy "wholesale_project_notes_coord_delete" on public.wholesale_project_notes
  for delete to authenticated
  using (public.is_wholesale_coordinator(auth.uid()) and author_id = auth.uid());

-- ============ OBJETIVOS: EL COMERCIAL REPORTA, NO REDEFINE ============
create or replace function public.wholesale_goals_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_wholesale_coordinator(auth.uid()) then
    return new;
  end if;
  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.target_value is distinct from old.target_value
     or new.month is distinct from old.month
     or new.year is distinct from old.year
     or new.rep_id is distinct from old.rep_id then
    raise exception 'El objetivo lo define coordinación: solo puedes reportar avance';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_wholesale_goals_guard on public.wholesale_goals;
create trigger trg_wholesale_goals_guard before update on public.wholesale_goals
  for each row execute function public.wholesale_goals_guard();

-- El comercial no borra objetivos, ni siquiera los suyos
drop policy if exists "wholesale_goals_rep_progress" on public.wholesale_goals;
create policy "wholesale_goals_rep_progress" on public.wholesale_goals
  for update to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()))
  with check (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));
