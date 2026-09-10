-- =====================================================================
-- Wholesale F9.1 · Un proyecto puede involucrar a varios comerciales
-- rep_id sigue siendo el responsable; el equipo va en su propia tabla.
-- =====================================================================

create table if not exists public.wholesale_project_reps (
  project_id uuid not null references public.wholesale_projects(id) on delete cascade,
  rep_id uuid not null references public.wholesale_reps(id) on delete cascade,
  primary key (project_id, rep_id)
);

create index if not exists wholesale_project_reps_rep_idx
  on public.wholesale_project_reps(rep_id);

-- El responsable histórico entra como parte del equipo
insert into public.wholesale_project_reps (project_id, rep_id)
select id, rep_id from public.wholesale_projects
where rep_id is not null and deleted_at is null
on conflict do nothing;

grant select, insert, update, delete on public.wholesale_project_reps to authenticated;
alter table public.wholesale_project_reps enable row level security;

drop policy if exists "wholesale_project_reps_coordinator" on public.wholesale_project_reps;
create policy "wholesale_project_reps_coordinator" on public.wholesale_project_reps
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_project_reps_read" on public.wholesale_project_reps;
create policy "wholesale_project_reps_read" on public.wholesale_project_reps
  for select to authenticated
  using (public.is_wholesale_rep(auth.uid()));

-- Un comercial ve y comenta los proyectos donde participa, aunque no
-- sea el responsable.
drop policy if exists "wholesale_projects_rep_read" on public.wholesale_projects;
create policy "wholesale_projects_rep_read" on public.wholesale_projects
  for select to authenticated
  using (
    public.is_wholesale_rep(auth.uid())
    and (
      rep_id = public.wholesale_rep_id(auth.uid())
      or exists (
        select 1 from public.wholesale_project_reps t
        where t.project_id = wholesale_projects.id
          and t.rep_id = public.wholesale_rep_id(auth.uid())
      )
    )
  );

drop policy if exists "wholesale_project_notes_rep" on public.wholesale_project_notes;
create policy "wholesale_project_notes_rep" on public.wholesale_project_notes
  for all to authenticated
  using (
    public.is_wholesale_rep(auth.uid())
    and exists (
      select 1 from public.wholesale_projects p
      left join public.wholesale_project_reps t on t.project_id = p.id
      where p.id = wholesale_project_notes.project_id
        and (p.rep_id = public.wholesale_rep_id(auth.uid())
             or t.rep_id = public.wholesale_rep_id(auth.uid()))
    )
  )
  with check (
    public.is_wholesale_rep(auth.uid())
    and exists (
      select 1 from public.wholesale_projects p
      left join public.wholesale_project_reps t on t.project_id = p.id
      where p.id = wholesale_project_notes.project_id
        and (p.rep_id = public.wholesale_rep_id(auth.uid())
             or t.rep_id = public.wholesale_rep_id(auth.uid()))
    )
  );
