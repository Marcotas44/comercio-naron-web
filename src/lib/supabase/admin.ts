import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase con clave SERVICE_ROLE.
 *
 * ⚠️ IGNORA RLS. Usar SOLO en el servidor (rutas /api/admin/*, scripts node),
 * NUNCA enviar al navegador. La validación de permisos se hace antes de
 * delegar en este cliente (ver requireRole en src/lib/auth.ts).
 */
let cached: ReturnType<typeof createClient> | null = null;

export function supabaseAdmin() {
  if (cached) return cached;

  const url = import.meta.env.SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Configura tu .env (ver .env.example).'
    );
  }

  cached = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cached;
}
