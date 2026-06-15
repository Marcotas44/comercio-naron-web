-- ─────────────────────────────────────────────────────────────────────────────
-- Alinear la DB con el código: tabla `profiles` + sembrar tu super_admin
-- ─────────────────────────────────────────────────────────────────────────────
-- Bloque idempotente y autocontenido. Pégalo en el SQL editor de Supabase.
-- Seguro re-ejecutar. NO borra datos existentes.
--
-- 👉 ÚNICO CAMBIO QUE DEBES HACER: pon tu email real en la última sentencia.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enum de roles (si no existe)
do $$ begin
  create type public.user_role as enum ('super_admin', 'admin_asociacion', 'editor');
exception when duplicate_object then null; end $$;

-- 2. Función de updated_at (si no existe)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 3. Tabla profiles (si no existe)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  nombre      text,
  role        public.user_role not null default 'editor',
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

-- 4. Trigger de updated_at
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 5. Trigger que crea el profile automáticamente al crear un usuario en Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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

-- 6. Helper de rol usado por las políticas RLS
create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 7. Activar RLS + política para que cada usuario lea su propio profile
alter table public.profiles enable row level security;

drop policy if exists "profiles: leer propio" on public.profiles;
create policy "profiles: leer propio"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profiles: super_admin lee todos" on public.profiles;
create policy "profiles: super_admin lee todos"
  on public.profiles for select
  using (public.current_user_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Sembrar TU usuario como super_admin (toma el id/email de auth.users)
--    👇 CAMBIA el email por el tuyo real.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.profiles (id, email, nombre, role)
select id, email, 'Super Admin', 'super_admin'
from auth.users
where email = 'CAMBIAR@ejemplo.com'
on conflict (id) do update
  set role = 'super_admin',
      nombre = coalesce(public.profiles.nombre, 'Super Admin');

-- 9. Verificación: deberías ver tu fila con role = super_admin
select id, email, nombre, role, created_at from public.profiles order by created_at;
