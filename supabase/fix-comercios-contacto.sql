-- ─────────────────────────────────────────────────────────────────────────────
-- Campos de contacto / redes sociales en `comercios`
-- ─────────────────────────────────────────────────────────────────────────────
-- Idempotente y no destructivo. Pégalo en el SQL editor de Supabase.
-- `logo`, `telefono`, `web` y `horario` ya existen en el schema; aquí solo se
-- añaden los que faltaban: whatsapp, instagram, facebook.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.comercios add column if not exists whatsapp  text;
alter table public.comercios add column if not exists instagram text;
alter table public.comercios add column if not exists facebook  text;

-- Verificación
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'comercios'
order by ordinal_position;
