-- ─────────────────────────────────────────────────────────────────────────────
-- Módulo "Solicitudes de socio" · Comercio de Narón
-- ─────────────────────────────────────────────────────────────────────────────
-- Idempotente y no destructivo. Pégalo en el SQL editor de Supabase.
-- Funciona tanto si la tabla no existe como si existe una versión anterior
-- (la del scaffold, con comercio_nombre/contacto_nombre y enum de 3 estados).
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- 1. Tabla canónica (si no existe)
create table if not exists public.solicitudes_socio (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),
  nombre      text,
  comercio    text,
  categoria   text,
  telefono    text,
  email       text,
  direccion   text,
  mensaje     text,
  estado      text not null default 'pendiente',
  notas_internas text,
  attended_by uuid
);

-- 2. Asegurar columnas nuevas en tablas preexistentes
alter table public.solicitudes_socio add column if not exists nombre         text;
alter table public.solicitudes_socio add column if not exists comercio       text;
alter table public.solicitudes_socio add column if not exists categoria      text;
alter table public.solicitudes_socio add column if not exists direccion      text;
alter table public.solicitudes_socio add column if not exists mensaje        text;
alter table public.solicitudes_socio add column if not exists notas_internas text;
alter table public.solicitudes_socio add column if not exists attended_by    uuid;
alter table public.solicitudes_socio add column if not exists updated_at     timestamptz not null default timezone('utc', now());

-- 3. Convertir `estado` a text (si venía como enum) para soportar 4 estados
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'solicitudes_socio'
      and column_name = 'estado' and data_type = 'USER-DEFINED'
  ) then
    alter table public.solicitudes_socio alter column estado drop default;
    alter table public.solicitudes_socio alter column estado type text using estado::text;
    alter table public.solicitudes_socio alter column estado set default 'pendiente';
  end if;
end $$;

-- 4. Validación de estados permitidos (idempotente)
alter table public.solicitudes_socio drop constraint if exists solicitudes_socio_estado_check;
alter table public.solicitudes_socio add constraint solicitudes_socio_estado_check
  check (estado in ('pendiente', 'contactado', 'aceptado', 'rechazado'));

-- 5. Aflojar NOT NULL de columnas legacy (si existieran) para el nuevo formato
do $$
begin
  begin alter table public.solicitudes_socio alter column comercio_nombre drop not null; exception when undefined_column then null; end;
  begin alter table public.solicitudes_socio alter column contacto_nombre drop not null; exception when undefined_column then null; end;
  begin alter table public.solicitudes_socio alter column email           drop not null; exception when undefined_column then null; end;
end $$;

-- 6. Trigger de updated_at (reutiliza set_updated_at; lo crea si no existe)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

drop trigger if exists trg_solicitudes_updated_at on public.solicitudes_socio;
create trigger trg_solicitudes_updated_at
  before update on public.solicitudes_socio
  for each row execute function public.set_updated_at();

-- 7. RLS: alta pública (anon) + lectura para usuarios autenticados del panel
alter table public.solicitudes_socio enable row level security;

drop policy if exists "solicitudes: insertar público"     on public.solicitudes_socio;
drop policy if exists "solicitudes: admins leen y editan"  on public.solicitudes_socio;
drop policy if exists "solicitudes: admins leen"           on public.solicitudes_socio;

-- Cualquiera puede CREAR una solicitud (el endpoint público valida y fuerza estado).
create policy "solicitudes: insertar público"
  on public.solicitudes_socio for insert
  to anon, authenticated
  with check (true);

-- Solo usuarios con rol asignado leen el listado (el panel usa service_role para editar/borrar).
create policy "solicitudes: admins leen"
  on public.solicitudes_socio for select
  to authenticated
  using (public.current_user_role() is not null);

-- 8. Índices
create index if not exists solicitudes_estado_idx     on public.solicitudes_socio (estado);
create index if not exists solicitudes_created_at_idx on public.solicitudes_socio (created_at desc);

-- Verificación
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'solicitudes_socio'
order by ordinal_position;
