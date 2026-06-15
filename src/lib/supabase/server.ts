import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

/**
 * Cliente Supabase ligado a las cookies de la petición Astro.
 * Se usa para resolver la sesión del usuario en SSR (middleware, /admin/*, /api/auth/*).
 * Respeta RLS.
 *
 * Usamos la API canónica `getAll`/`setAll` de @supabase/ssr v0.5+. Es la única
 * que maneja correctamente las cookies fragmentadas que emite supabase para
 * tokens largos (sb-…-auth-token.0, .1, .2…). La API legacy `get/set/remove`
 * deja fuera fragmentos y produce sesiones "perdidas" al redirigir.
 */
export function createSupabaseServerClient(cookies: AstroCookies, request: Request) {
  const url = import.meta.env.SUPABASE_URL;
  const anonKey = import.meta.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Faltan SUPABASE_URL o SUPABASE_ANON_KEY. Copia .env.example a .env y configura las variables.'
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        const header = request.headers.get('cookie') ?? '';
        if (!header) return [];
        const out: Array<{ name: string; value: string }> = [];
        for (const pair of header.split(/;\s*/)) {
          if (!pair) continue;
          const eq = pair.indexOf('=');
          if (eq === -1) continue;
          const name = pair.slice(0, eq).trim();
          const raw = pair.slice(eq + 1);
          let value = raw;
          try { value = decodeURIComponent(raw); } catch { /* valor no codificado */ }
          out.push({ name, value });
        }
        return out;
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, { ...options, path: options.path ?? '/' });
        }
      },
    },
  });
}
