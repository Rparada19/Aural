-- =====================================================================
-- Aural · Entrenamiento IA — extra
-- Glosario / prohibidas / secciones / documentos referencia / ai_spec catálogo
-- =====================================================================

alter table public.ai_report_config
  add column if not exists glossary jsonb not null default '[]'::jsonb,
  add column if not exists banned_words text[] not null default '{}',
  add column if not exists report_sections text[] not null default array[
    'Identificación del paciente',
    'Resumen otoscópico',
    'Audiometría tonal liminar',
    'Logoaudiometría',
    'Diagnóstico audiológico',
    'Recomendaciones'
  ];

-- Documentos de referencia (PDFs) que la IA usa como material de consulta
create table if not exists public.ai_reference_docs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id)
);

alter table public.ai_reference_docs enable row level security;

drop policy if exists "ai_refs_admin_all" on public.ai_reference_docs;
create policy "ai_refs_admin_all" on public.ai_reference_docs
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

grant select, insert, delete on public.ai_reference_docs to authenticated;

-- Bucket privado
insert into storage.buckets (id, name, public)
values ('ai-refs', 'ai-refs', false)
on conflict (id) do nothing;

drop policy if exists "ai_refs_admin_write" on storage.objects;
create policy "ai_refs_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ai-refs' and public.is_admin(auth.uid()));

drop policy if exists "ai_refs_admin_delete" on storage.objects;
create policy "ai_refs_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ai-refs' and public.is_admin(auth.uid()));

drop policy if exists "ai_refs_admin_read" on storage.objects;
create policy "ai_refs_admin_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'ai-refs' and public.is_admin(auth.uid()));

-- Descripciones editables por producto/plataforma para que la IA hable con propiedad
alter table public.technologies add column if not exists ai_spec text;
alter table public.platforms    add column if not exists ai_spec text;

-- Semilla con lo que estaba hardcoded
update public.technologies set ai_spec =
  'Audífono con procesamiento SoundSense Learn que aprende de las preferencias del usuario en distintos entornos. Sistema TruAcoustics para naturalidad de voz. Indicado en hipoacusias leves a moderadas-severas.'
  where name = 'Evoke' and ai_spec is null;
update public.technologies set ai_spec =
  'Audífono con procesamiento integral basado en redes neuronales (BrainHearing). Excelente desempeño en ruido. Indicado en hipoacusias leves a severas que requieren claridad de voz en ambientes complejos.'
  where name = 'Magnify' and ai_spec is null;
update public.technologies set ai_spec =
  'Audífono ultra-discreto con tecnología SoundSense Adapt y procesamiento de sonido natural. Ideal para usuarios primerizos. Indicado en hipoacusias leves a moderadas-severas.'
  where name = 'Moment' and ai_spec is null;
update public.technologies set ai_spec =
  'Receptor en canal (RIC) compacto con conectividad inalámbrica avanzada (Bluetooth) y streaming directo a iPhone/Android. Indicado para pacientes activos con hipoacusias leves a severas.'
  where name = 'Smart-RIC' and ai_spec is null;
update public.technologies set ai_spec =
  'Última generación: procesador PureSound 3.0 con reducción de ruido 35% superior, Bluetooth LE Audio + Auracast, recarga inalámbrica 30h, diseño RIC ultra-discreto 22% más pequeño. Indicado en hipoacusias leves a severas (15–90 dB HL), pacientes activos que requieren conectividad y simplicidad.'
  where name = 'Allure' and ai_spec is null;

update public.platforms set ai_spec = 'plataforma básica: 4 canales, programa único, ideal para ambientes tranquilos.'                              where code = '30'  and ai_spec is null;
update public.platforms set ai_spec = 'plataforma básica+: 6 canales, 2 programas, manejo básico de ruido.'                                        where code = '50'  and ai_spec is null;
update public.platforms set ai_spec = 'plataforma media: 8 canales, direccionalidad adaptativa, reducción de ruido.'                                where code = '100' and ai_spec is null;
update public.platforms set ai_spec = 'plataforma media+: 10 canales, antifeedback dinámico, conectividad básica.'                                  where code = '110' and ai_spec is null;
update public.platforms set ai_spec = 'plataforma media-alta: 12 canales, direccionalidad inteligente, streaming.'                                  where code = '220' and ai_spec is null;
update public.platforms set ai_spec = 'plataforma alta: 16 canales, escenarios automáticos, aprendizaje contextual.'                                where code = '330' and ai_spec is null;
update public.platforms set ai_spec = 'plataforma premium: 20+ canales, IA acústica, todos los programas avanzados, máxima personalización.'         where code = '440' and ai_spec is null;
