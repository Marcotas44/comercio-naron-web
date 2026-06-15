-- ─────────────────────────────────────────────────────────────────────────────
-- Ascender al primer usuario a super_admin
-- ─────────────────────────────────────────────────────────────────────────────
-- Flujo recomendado:
--   1) Crear el usuario desde el dashboard de Supabase (Authentication → Users
--      → Add user → "Send invite" o "Create user with password").
--   2) Ejecutar este SQL sustituyendo el email.
-- ─────────────────────────────────────────────────────────────────────────────

update public.profiles
set role = 'super_admin',
    nombre = coalesce(nombre, 'Super Admin')
where email = 'CAMBIAR@ejemplo.com';

-- Verificación
select id, email, nombre, role, created_at from public.profiles order by created_at;
