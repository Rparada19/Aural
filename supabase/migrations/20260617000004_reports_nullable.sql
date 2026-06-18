-- file_url se vuelve opcional: ahora hay informes basados en imágenes + IA sin PDF subido
alter table public.medical_reports alter column file_url drop not null;
