-- =====================================================================
-- Wholesale F15 · CRM de oportunidades
-- Prospectos y negocios en curso (cuentas nuevas, contratos por volumen,
-- reactivaciones, ampliaciones), las personas de cada centro y cada
-- interacción con quién participó de cada lado.
-- =====================================================================

do $$ begin
  create type wholesale_opp_stage as enum
    ('identificado', 'contactado', 'visitado', 'demo', 'propuesta', 'negociacion', 'ganado', 'perdido');
exception when duplicate_object then null; end $$;

create table if not exists public.wholesale_opportunities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'cuenta_nueva'
    check (kind in ('cuenta_nueva', 'contrato_volumen', 'reactivacion', 'ampliacion')),
  client_id uuid references public.wholesale_clients(id) on delete set null,
  rep_id uuid references public.wholesale_reps(id),

  city text,
  zone text,
  source text,
  nit text,
  phone text,
  email text,

  stage wholesale_opp_stage not null default 'identificado',
  est_units integer,
  est_amount numeric(14,2),
  probability integer check (probability between 0 and 100),
  expected_close date,

  next_action text,
  next_action_on date,

  lost_reason text,
  won_on date,
  notes text,

  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists wholesale_opps_rep_idx
  on public.wholesale_opportunities(rep_id, stage) where deleted_at is null;
create index if not exists wholesale_opps_next_idx
  on public.wholesale_opportunities(next_action_on) where deleted_at is null;

drop trigger if exists trg_wholesale_opps_updated_at on public.wholesale_opportunities;
create trigger trg_wholesale_opps_updated_at before update on public.wholesale_opportunities
  for each row execute function public.set_updated_at();

-- Personas del centro: quién decide, quién influye, quién usa
create table if not exists public.wholesale_opp_contacts (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.wholesale_opportunities(id) on delete cascade,
  name text not null,
  role text,
  influence text not null default 'influye' check (influence in ('decide', 'influye', 'usa')),
  sentiment text not null default 'neutral' check (sentiment in ('a_favor', 'neutral', 'en_contra')),
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists wholesale_opp_contacts_opp_idx on public.wholesale_opp_contacts(opportunity_id);

-- Cada contacto: quiénes de Aural y quiénes del centro estuvieron
create table if not exists public.wholesale_interactions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.wholesale_opportunities(id) on delete cascade,
  kind text not null default 'llamada'
    check (kind in ('llamada', 'whatsapp', 'visita', 'virtual', 'correo', 'demo', 'evento')),
  happened_on date not null default current_date,
  rep_ids uuid[] not null default '{}',
  contact_ids uuid[] not null default '{}',
  summary text not null,
  outcome text not null default 'neutral' check (outcome in ('avanza', 'neutral', 'frena')),
  author_id uuid references public.profiles(id),
  author_name text,
  created_at timestamptz not null default now()
);
create index if not exists wholesale_interactions_opp_idx
  on public.wholesale_interactions(opportunity_id, happened_on desc);

-- Historial de etapas, para medir conversión y tiempos del embudo
create table if not exists public.wholesale_opp_stage_log (
  id bigserial primary key,
  opportunity_id uuid not null references public.wholesale_opportunities(id) on delete cascade,
  from_stage wholesale_opp_stage,
  to_stage wholesale_opp_stage not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create or replace function public.wholesale_opp_log_stage()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into wholesale_opp_stage_log(opportunity_id, from_stage, to_stage, changed_by)
    values (new.id, null, new.stage, auth.uid());
  elsif new.stage is distinct from old.stage then
    insert into wholesale_opp_stage_log(opportunity_id, from_stage, to_stage, changed_by)
    values (new.id, old.stage, new.stage, auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists trg_wholesale_opp_stage on public.wholesale_opportunities;
create trigger trg_wholesale_opp_stage after insert or update of stage on public.wholesale_opportunities
  for each row execute function public.wholesale_opp_log_stage();

-- ================================ RLS =================================
grant select, insert, update, delete on public.wholesale_opportunities to authenticated;
grant select, insert, update, delete on public.wholesale_opp_contacts to authenticated;
grant select, insert, update, delete on public.wholesale_interactions to authenticated;
grant select on public.wholesale_opp_stage_log to authenticated;

alter table public.wholesale_opportunities enable row level security;
alter table public.wholesale_opp_contacts enable row level security;
alter table public.wholesale_interactions enable row level security;
alter table public.wholesale_opp_stage_log enable row level security;

-- ¿Puede el usuario trabajar esta oportunidad?
create or replace function public.wholesale_can_opp(uid uuid, opp uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_wholesale_coordinator(uid)
      or exists (
        select 1 from wholesale_opportunities o
        where o.id = opp
          and public.is_wholesale_rep(uid)
          and o.rep_id = public.wholesale_rep_id(uid)
      );
$$;

drop policy if exists "wholesale_opps_coordinator" on public.wholesale_opportunities;
create policy "wholesale_opps_coordinator" on public.wholesale_opportunities
  for all to authenticated
  using (public.is_wholesale_coordinator(auth.uid()))
  with check (public.is_wholesale_coordinator(auth.uid()));

drop policy if exists "wholesale_opps_rep" on public.wholesale_opportunities;
create policy "wholesale_opps_rep" on public.wholesale_opportunities
  for all to authenticated
  using (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()))
  with check (public.is_wholesale_rep(auth.uid()) and rep_id = public.wholesale_rep_id(auth.uid()));

drop policy if exists "wholesale_opp_contacts_all" on public.wholesale_opp_contacts;
create policy "wholesale_opp_contacts_all" on public.wholesale_opp_contacts
  for all to authenticated
  using (public.wholesale_can_opp(auth.uid(), opportunity_id))
  with check (public.wholesale_can_opp(auth.uid(), opportunity_id));

drop policy if exists "wholesale_interactions_all" on public.wholesale_interactions;
create policy "wholesale_interactions_all" on public.wholesale_interactions
  for all to authenticated
  using (public.wholesale_can_opp(auth.uid(), opportunity_id))
  with check (public.wholesale_can_opp(auth.uid(), opportunity_id));

drop policy if exists "wholesale_opp_stage_log_read" on public.wholesale_opp_stage_log;
create policy "wholesale_opp_stage_log_read" on public.wholesale_opp_stage_log
  for select to authenticated
  using (public.wholesale_can_opp(auth.uid(), opportunity_id));
