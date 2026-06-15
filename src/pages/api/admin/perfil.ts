export const prerender = false;

import type { APIRoute } from 'astro';
import { requireApiRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { getString, flashRedirect } from '../../../lib/form';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const guard = await requireApiRole(cookies, request);
  if ('response' in guard) return guard.response;
  const me = guard.user;

  const fd = await request.formData();
  const nombre = getString(fd, 'nombre');

  const sb = supabaseAdmin();
  const { error } = await sb.from('profiles').update({ nombre }).eq('id', me.id);
  if (error) return redirect(flashRedirect('/admin/configuracion', error.message, 'error'), 303);
  return redirect(flashRedirect('/admin/configuracion', 'Perfil actualizado.'), 303);
};
