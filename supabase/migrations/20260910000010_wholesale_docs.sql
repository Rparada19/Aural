-- =====================================================================
-- Wholesale F8 · Documentos compartidos y conversación de proyectos
--   · Coordinación publica material y elige quién lo ve.
--   · Cada proyecto tiene un hilo donde coordinador y comercial dejan
--     avances, se responden y adjuntan archivos para revisión.
-- =====================================================================

-- ============================ ALMACENAMIENTO ==========================
insert into storage.buckets (id, name, public)
values ('wholesale-docs', 'wholesale-docs', false)
on conflict (id) do nothing;

-- Todo el mercado puede leer los archivos; el acceso real se controla
-- por la fila que los referencia y por URLs firmadas.
drop policy if exists "wholesale_docs_read" on storage.objects;
create policy "wholesale_docs_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'wholesale-docs'
    and (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_rep(auth.uid()))
  );

drop policy if exists "wholesale_docs_write" on storage.objects;
create policy "wholesale_docs_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wholesale-docs'
    and (public.is_wholesale_coordinator(auth.uid()) or public.is_wholesale_rep(auth.uid()))
  );

drop policy if exists "wholesale_docs_delete" on storage.objects;
create policy "wholesale_docs_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'wholesale-docs' and public.is_wholesale_coordinator(auth.uid()));

-- ============================= DOCUMENTOS =============================
create table if not exists public.wholesale_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_path text not null,
  file_name text not null,
  file_size integer,
  mime_type text,
  -- Sin filas en la tabla de audiencia, el documento es para todos
  is_public boolean not null default true,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.wholesale_document_audience (
  document_id uuid not null references public.wholesale_documents(id) on delete cascade,
  rep_id uuid not null references public.wholesale_reps(id) on delete cascade,
  primary key (document_id, rep_id)
);

create index if not exists wholesale_documents_recent_idx
  on public.wholesale_documents(created_at desc) where deleted_at is null;

-- ===================== CONVERSACIÓN DE PROYECTOS ======================
create table if not exists public.wholesale_project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.wholesale_projects(id) on delete cascade,
  author_id uuid references public.profiles(id),
  author_name text,
  author_role text,
  body text,
  -- Un mensaje puede ser solo texto, solo archivo, o ambos
  file_path text,
  file_name text,
  file_size integer,
  -- Marca el avance que el mensaje reporta, si lo cambia
  progress_percent integer check (progress_percent between 0 and 100),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists wholesale_project_notes_idx
  on public.wholesale_project_notes(project_id, created_at) where deleted_at is null;

-- ============================== TRIGGERS ==============================
drop trigger if exists trg_wholesale_documents_updated_at on public.wholesale_documents;
create trigger trg_wholesale_documents_updated_at before update on public.wholesale_documents
  for each row execute function public.set_updated_at();

-- ================================ RLS =================================
grant select, insert, update, delete on public.wholesale_documents to authenticated;
grant select, insert, update, delete on public.wholesale_document_audience to authenticated;
grant select, insert, update, delete on public.wholesale_project_notes to authenticated;

alter table public.wholesale_documents enable row level security;
alter table public.wholesale_document_audience enable row level security;
alter table public.wholesale_project_notes enable row level security;

-- Documentos: coordinación publica; el comercial ve los públicos y los
-- que le fueron asignados.
drop policy if exists "wholesale_documents_coordinator" on public.wholesale_documents;
create policy "wholesale_documents_coordinator" on public.wholesale_documents
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_documents_rep_read" on public.wholesale_documents;
create policy "wholesale_documents_rep_read" on public.wholesale_documents
  for select to authenticated
  using (
    public.is_wholesale_rep(auth.uid())
    and (
      is_public
      or exists (
        select 1 from public.wholesale_document_audience a
        where a.document_id = wholesale_documents.id
          and a.rep_id = public.wholesale_rep_id(auth.uid())
      )
    )
  );

drop policy if exists "wholesale_document_audience_coordinator" on public.wholesale_document_audience;
create policy "wholesale_document_audience_coordinator" on public.wholesale_document_audience
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_document_audience_rep_read" on public.wholesale_document_audience;
create policy "wholesale_document_audience_rep_read" on public.wholesale_document_audience
  for select to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));

-- Hilo de proyecto: ambos lados escriben, cada uno sobre lo suyo.
drop policy if exists "wholesale_project_notes_coordinator" on public.wholesale_project_notes;
create policy "wholesale_project_notes_coordinator" on public.wholesale_project_notes
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_project_notes_rep" on public.wholesale_project_notes;
create policy "wholesale_project_notes_rep" on public.wholesale_project_notes
  for all to authenticated
  using (
    public.is_wholesale_rep(auth.uid())
    and exists (
      select 1 from public.wholesale_projects p
      where p.id = wholesale_project_notes.project_id
        and p.rep_id = public.wholesale_rep_id(auth.uid())
    )
  )
  with check (
    public.is_wholesale_rep(auth.uid())
    and exists (
      select 1 from public.wholesale_projects p
      where p.id = wholesale_project_notes.project_id
        and p.rep_id = public.wholesale_rep_id(auth.uid())
    )
  );
