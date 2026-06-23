-- Lateralidad de la pérdida auditiva (aplica a 'sale_candidate' y 'sudden_hearing_loss')
do $$ begin
  create type hearing_loss_side as enum ('unilateral','bilateral');
exception when duplicate_object then null; end $$;

alter table public.patients
  add column if not exists hearing_loss_side hearing_loss_side;
