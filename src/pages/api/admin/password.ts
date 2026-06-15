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
  const password = getString(fd, 'password') ?? '';
  const password2 = getString(fd, 'password2') ?? '';

  if (password.length < 8) {
    return redirect(flashRedirect('/admin/configuracion', 'La contraseña debe tener al menos 8 caracteres.', 'error'), 303);
  }
  if (password !== password2) {
    return redirect(flashRedirect('/admin/configuracion', 'Las contraseñas no coinciden.', 'error'), 303);
  }

  const sb = supabaseAdmin();
  const { error } = await sb.auth.admin.updateUserById(me.id, { password });
  if (error) return redirect(flashRedirect('/admin/configuracion', error.message, 'error'), 303);
  return redirect(flashRedirect('/admin/configuracion', 'Contraseña actualizada.'), 303);
};
