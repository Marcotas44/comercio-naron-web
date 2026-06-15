-- ─────────────────────────────────────────────────────────────────────────────
-- Asegurar que la tabla `comercios` tiene TODAS las columnas que usa el panel
-- ─────────────────────────────────────────────────────────────────────────────
-- Idempotente y no destructivo. Pégalo en el SQL editor de Supabase.
-- Si tu tabla se creó sin alguna columna (p. ej. `logo`), la consulta del
-- listado /admin/comercios fallaba y mostraba 0 comercios. Esto lo corrige.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.comercios add column if not exists logo             text;
alter table public.comercios add column if not exists galeria_imagenes text[] not null default '{}';
alter table public.comercios add column if not exists imagen           text;
alter table public.comercios add column if not exists descripcion      text;
alter table public.comercios add column if not exists horario          text;
alter table public.comercios add column if not exists destacado        boolean not null default false;
alter table public.comercios add column if not exists categoria        text;
alter table public.comercios add column if not exists zona             text;
alter table public.comercios add column if not exists direccion        text;
alter table public.comercios add column if not exists telefono         text;
alter table public.comercios add column if not exists email            text;
alter table public.comercios add column if not exists web              text;
alter table public.comercios add column if not exists created_at       timestamptz not null default timezone('utc', now());
alter table public.comercios add column if not exists updated_at       timestamptz not null default timezone('utc', now());

-- Verificación: lista las columnas reales de la tabla.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'comercios'
order by ordinal_position;
