-- ─────────────────────────────────────────────────────────────────────────────
-- Políticas RLS · Comercio de Narón
-- ─────────────────────────────────────────────────────────────────────────────
-- Modelo:
--   • Las operaciones administrativas del panel usan la clave SERVICE_ROLE,
--     que ignora RLS. La validación de rol se hace en el servidor (auth.ts).
--   • La clave ANON respeta RLS. Se concede:
--       - Lectura pública de comercios.
--       - Lectura pública de noticias publicadas y campañas activas.
--       - Inserción de solicitudes de socio desde formularios públicos.
--   • Los usuarios autenticados pueden leer su propio profile.
-- ─────────────────────────────────────────────────────────────────────────────

-- Activar RLS en todas las tablas
alter table public.profiles            enable row level security;
alter table public.comercios           enable row level security;
alter table public.noticias            enable row level security;
alter table public.campanas            enable row level security;
alter table public.solicitudes_socio   enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "profiles: leer propio"            on public.profiles;
drop policy if exists "profiles: super_admin lee todos"  on public.profiles;
drop policy if exists "profiles: actualizar propio"      on public.profiles;

create policy "profiles: leer propio"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: super_admin lee todos"
  on public.profiles for select
  using (public.current_user_role() = 'super_admin');

-- Los usuarios pueden cambiar su nombre, no su rol. El servidor (service_role)
-- es el único que muta el rol desde el panel de Configuración.
create policy "profiles: actualizar propio"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- comercios
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "comercios: lectura pública" on public.comercios;

create policy "comercios: lectura pública"
  on public.comercios for select
  to anon, authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- noticias
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "noticias: lectura pública publicadas" on public.noticias;
drop policy if exists "noticias: editores leen todo"         on public.noticias;

create policy "noticias: lectura pública publicadas"
  on public.noticias for select
  to anon
  using (publicado = true);

create policy "noticias: editores leen todo"
  on public.noticias for select
  to authenticated
  using (public.current_user_role() is not null);

-- ─────────────────────────────────────────────────────────────────────────────
-- campanas
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "campanas: lectura pública activas" on public.campanas;
drop policy if exists "campanas: editores leen todo"       on public.campanas;

create policy "campanas: lectura pública activas"
  on public.campanas for select
  to anon
  using (activa = true);

create policy "campanas: editores leen todo"
  on public.campanas for select
  to authenticated
  using (public.current_user_role() is not null);

-- ─────────────────────────────────────────────────────────────────────────────
-- solicitudes_socio
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "solicitudes: insertar público"       on public.solicitudes_socio;
drop policy if exists "solicitudes: admins leen y editan"   on public.solicitudes_socio;

-- Las solicitudes solo se pueden CREAR desde anon (formulario público).
-- Para evitar abuso, idealmente proteger el formulario con un webhook + captcha.
create policy "solicitudes: insertar público"
  on public.solicitudes_socio for insert
  to anon
  with check (true);

-- Los usuarios autenticados con rol asignado pueden leer (panel).
create policy "solicitudes: admins leen y editan"
  on public.solicitudes_socio for select
  to authenticated
  using (public.current_user_role() is not null);

-- IMPORTANTE: las operaciones de UPDATE/DELETE en cualquier tabla las realiza
-- exclusivamente el backend usando la clave SERVICE_ROLE, que ignora RLS.
-- El servidor (src/lib/auth.ts → requireRole) valida que el usuario tiene
-- permiso antes de delegar la operación. Por eso NO hay políticas UPDATE/DELETE
-- expuestas a anon ni a authenticated.
