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

/** Hosts aceptables para esta petición (deriva del propio request, soporta proxy). */
function requestHosts(request: Request): Set<string> {
  const hosts = new Set<string>();
  try { hosts.add(new URL(request.url).host); } catch { /* url no parseable */ }
  const xf = request.headers.get('x-forwarded-host');
  if (xf) hosts.add(xf);
  const h = request.headers.get('host');
  if (h) hosts.add(h);
  return hosts;
}

/**
 * Defensa CSRF: para métodos que mutan estado, exige que el Origin (o, en su
 * defecto, el Referer) coincida con el host de la petición. Los formularios
 * normales del panel son same-origin → el navegador envía Origin y pasan.
 * Una petición cross-site automatizada no coincide y se rechaza.
 */
export function isSameOrigin(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

  let sourceHost: string | null = null;
  const origin = request.headers.get('origin');
  if (origin) {
    try { sourceHost = new URL(origin).host; } catch { /* origin inválido */ }
  }
  if (!sourceHost) {
    const referer = request.headers.get('referer');
    if (referer) {
      try { sourceHost = new URL(referer).host; } catch { /* referer inválido */ }
    }
  }
  // Sin Origin ni Referer en una mutación: rechazamos (postura segura).
  if (!sourceHost) return false;
  return requestHosts(request).has(sourceHost);
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
  // CSRF: rechaza mutaciones cuyo origen no coincide con el host actual.
  if (!isSameOrigin(request)) {
    return {
      response: new Response(JSON.stringify({ error: 'Origen no permitido' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
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
