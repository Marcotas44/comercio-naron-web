import type { AstroCookies } from 'astro';
import { createSupabaseServerClient } from './supabase/server';
import { supabaseAdmin } from './supabase/admin';
import type { SessionUser, UserRole } from './supabase/types';

/**
 * Resuelve el usuario autenticado a partir de las cookies de la petición.
 * Devuelve null si no hay sesión válida o si el usuario no tiene profile.
 *
 * Necesita el `request` original porque @supabase/ssr lee las cookies vía
 * `getAll()` directamente de la cabecera Cookie.
 */
export async function getSessionUser(cookies: AstroCookies, request: Request): Promise<SessionUser | null> {
  const supabase = createSupabaseServerClient(cookies, request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Usar service_role para leer el profile de forma fiable, incluso si las
  // políticas RLS cambian. Solo se ejecuta en el servidor.
  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, nombre, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;
  return profile as unknown as SessionUser;
}

const ROLE_PRIORITY: Record<UserRole, number> = {
  editor: 1,
  admin_asociacion: 2,
  super_admin: 3,
};

export function hasRole(user: SessionUser | null, min: UserRole): boolean {
  if (!user) return false;
  return ROLE_PRIORITY[user.role] >= ROLE_PRIORITY[min];
}

export interface RequireRoleOptions {
  /** Rol mínimo necesario. Por defecto 'editor' (cualquier usuario del panel). */
  min?: UserRole;
}

/**
 * Para usar dentro de endpoints /api/admin/*: comprueba sesión y rol.
 * Si falla, devuelve una Response apropiada; si no, devuelve el user.
 */
export async function requireApiRole(
  cookies: AstroCookies,
  request: Request,
  options: RequireRoleOptions = {},
): Promise<{ user: SessionUser } | { response: Response }> {
  const user = await getSessionUser(cookies, request);
  if (!user) {
    return {
      response: new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
  if (!hasRole(user, options.min ?? 'editor')) {
    return {
      response: new Response(JSON.stringify({ error: 'Permisos insuficientes' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
  return { user };
}
