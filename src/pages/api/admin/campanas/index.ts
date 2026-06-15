export const prerender = false;

import type { APIRoute } from 'astro';
import { requireApiRole } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { getString, getRequired, getBool, FormError, flashRedirect } from '../../../../lib/form';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const guard = await requireApiRole(cookies, request, { min: 'editor' });
  if ('response' in guard) return guard.response;

  const fd = await request.formData();
  const id = getString(fd, 'id');

  try {
    const titulo = getRequired(fd, 'titulo');
    const payload = {
      titulo,
      descripcion: getString(fd, 'descripcion'),
      fecha_inicio: getString(fd, 'fecha_inicio'),
      fecha_fin: getString(fd, 'fecha_fin'),
      imagen: getString(fd, 'imagen'),
      activo: getBool(fd, 'activo'),
    };

    const sb = supabaseAdmin();
    if (id) {
      const { error } = await sb.from('campanas').update(payload).eq('id', id);
      if (error) throw new FormError(error.message);
      return redirect(flashRedirect('/admin/campanas', `Campaña "${titulo}" actualizada.`), 303);
    }
    const { error } = await sb.from('campanas').insert(payload);
    if (error) throw new FormError(error.message);
    return redirect(flashRedirect('/admin/campanas', `Campaña "${titulo}" creada.`), 303);
  } catch (e) {
    const msg = e instanceof FormError ? e.message : 'Error inesperado al guardar.';
    return redirect(flashRedirect(id ? `/admin/campanas/${id}` : '/admin/campanas/nueva', msg, 'error'), 303);
  }
};
