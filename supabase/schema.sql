-- ─────────────────────────────────────────────────────────────────────────────
-- Comercio de Narón · Schema base
-- ─────────────────────────────────────────────────────────────────────────────
-- Ejecutar en el SQL editor de Supabase (en orden):
--   1) schema.sql      (este archivo)
--   2) rls.sql         (políticas de seguridad a nivel de fila)
--   3) storage.sql     (buckets de Storage)
-- Después, crear el primer usuario super_admin (ver docs/ADMIN.md).
-- ─────────────────────────────────────────────────────────────────────────────

-- Extensiones necesarias
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.user_role as enum ('super_admin', 'admin_asociacion', 'editor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.solicitud_estado as enum ('pendiente', 'aceptado', 'rechazado');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: trigger genérico que mantiene updated_at
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- 1:1 con auth.users. Guarda rol y datos visibles del usuario admin.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  nombre      text,
  role        public.user_role not null default 'editor',
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Al crear un usuario en auth.users, crear su profile por defecto (rol editor).
-- El super_admin puede ascender luego desde el panel.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper para usar en políticas: rol del usuario actual.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- comercios
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.comercios (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  nombre             text not null,
  categoria          text,
  zona               text,
  direccion          text,
  telefono           text,
  email              text,
  web                text,
  descripcion        text,
  horario            text,
  destacado          boolean not null default false,
  logo               text,
  galeria_imagenes   text[] not null default '{}',
  imagen             text,
  created_at         timestamptz not null default timezone('utc', now()),
  updated_at         timestamptz not null default timezone('utc', now())
);

create index if not exists comercios_categoria_idx on public.comercios (categoria);
create index if not exists comercios_zona_idx       on public.comercios (zona);
create index if not exists comercios_destacado_idx  on public.comercios (destacado) where destacado;

drop trigger if exists trg_comercios_updated_at on public.comercios;
create trigger trg_comercios_updated_at
  before update on public.comercios
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- noticias
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.noticias (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  titulo              text not null,
  resumen             text,
  contenido           text,
  imagen              text,
  fecha_publicacion   timestamptz,
  autor               text,
  publicado           boolean not null default false,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

create index if not exists noticias_publicado_fecha_idx
  on public.noticias (publicado, fecha_publicacion desc);

drop trigger if exists trg_noticias_updated_at on public.noticias;
create trigger trg_noticias_updated_at
  before update on public.noticias
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- campanas
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.campanas (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  descripcion     text,
  fecha_inicio    date,
  fecha_fin       date,
  imagen          text,
  activo          boolean not null default true,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now())
);

create index if not exists campanas_activo_idx       on public.campanas (activo) where activo;
create index if not exists campanas_fecha_inicio_idx on public.campanas (fecha_inicio desc);

drop trigger if exists trg_campanas_updated_at on public.campanas;
create trigger trg_campanas_updated_at
  before update on public.campanas
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- solicitudes_socio
-- Las solicitudes pueden llegar por formulario público (anon insert)
-- o registrarse manualmente desde el panel.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.solicitudes_socio (
  id                uuid primary key default gen_random_uuid(),
  comercio_nombre   text not null,
  contacto_nombre   text not null,
  email             text not null,
  telefono          text,
  mensaje           text,
  estado            public.solicitud_estado not null default 'pendiente',
  notas_internas    text,
  attended_by       uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now())
);

create index if not exists solicitudes_estado_idx     on public.solicitudes_socio (estado);
create index if not exists solicitudes_created_at_idx on public.solicitudes_socio (created_at desc);

drop trigger if exists trg_solicitudes_updated_at on public.solicitudes_socio;
create trigger trg_solicitudes_updated_at
  before update on public.solicitudes_socio
  for each row execute function public.set_updated_at();
