import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

/**
 * Cliente Supabase con la clave ANON (respeta RLS), sin sesión.
 * Para operaciones públicas del servidor, como insertar solicitudes de socio
 * desde el formulario web. Least-privilege: NO usa service_role.
 */
let cached: ReturnType<typeof createClient> | null = null;

export function supabaseAnon() {
  if (cached) return cached;

  const url = import.meta.env.SUPABASE_URL;
  const anonKey = import.meta.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY (ver .env.example).');
  }

  cached = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket },
  });
  return cached;
}
