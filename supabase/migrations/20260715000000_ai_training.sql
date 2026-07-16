-- =====================================================================
-- Aural · Entrenamiento IA: prompt editable + ejemplos gold
-- =====================================================================

-- Configuración singleton editable desde admin
create table if not exists public.ai_report_config (
  id integer primary key default 1 check (id = 1),
  system_prompt text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.ai_report_config (id, system_prompt)
values (1, '')
on conflict (id) do nothing;

alter table public.ai_report_config enable row level security;

drop policy if exists "ai_config_admin_all" on public.ai_report_config;
create policy "ai_config_admin_all" on public.ai_report_config
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select, insert, update on public.ai_report_config to authenticated;

-- Marcar informes como "ejemplo perfecto" para few-shot en generaciones futuras
alter table public.medical_reports
  add column if not exists is_gold_example boolean not null default false;

create index if not exists medical_reports_gold_idx
  on public.medical_reports(is_gold_example)
  where is_gold_example = true;
