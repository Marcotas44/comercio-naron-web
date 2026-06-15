export const prerender = false;

import type { APIRoute } from 'astro';
import { requireApiRole } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { getString, getRequired, getBool, FormError, flashRedirect } from '../../../../lib/form';
import { triggerDeploy } from '../../../../lib/deploy';
import { slugify } from '../../../../lib/slug';

const DEPLOY_MSG = ' La web pública se actualizará en unos minutos.';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const guard = await requireApiRole(cookies, request, { min: 'editor' });
  if ('response' in guard) return guard.response;

  const fd = await request.formData();
  const id = getString(fd, 'id');

  try {
    const titulo = getRequired(fd, 'titulo');
    const slugRaw = getString(fd, 'slug');
    const slug = slugify(slugRaw ?? titulo);
    if (!slug) throw new FormError('El slug es obligatorio.');

    const payload = {
      titulo,
      slug,
      resumen: getString(fd, 'resumen'),
      descripcion: getString(fd, 'descripcion'),
      fecha_inicio: getString(fd, 'fecha_inicio'),
      fecha_fin: getString(fd, 'fecha_fin'),
      imagen: getString(fd, 'imagen'),
      activa: getBool(fd, 'activa'),
    };

    const sb = supabaseAdmin();
    if (id) {
      const { error } = await sb.from('campanas').update(payload).eq('id', id);
      if (error) {
        if (error.code === '23505') throw new FormError('Ya existe una campaña con ese slug. Cámbialo.');
        throw new FormError(error.message);
      }
      const deployed = await triggerDeploy();
      return redirect(flashRedirect('/admin/campanas', `Campaña "${titulo}" actualizada.` + (deployed ? DEPLOY_MSG : '')), 303);
    }
    const { error } = await sb.from('campanas').insert(payload);
    if (error) {
      if (error.code === '23505') throw new FormError('Ya existe una campaña con ese slug. Cámbialo.');
      throw new FormError(error.message);
    }
    const deployed = await triggerDeploy();
    return redirect(flashRedirect('/admin/campanas', `Campaña "${titulo}" creada.` + (deployed ? DEPLOY_MSG : '')), 303);
  } catch (e) {
    const msg = e instanceof FormError ? e.message : 'Error inesperado al guardar.';
    return redirect(flashRedirect(id ? `/admin/campanas/${id}` : '/admin/campanas/nueva', msg, 'error'), 303);
  }
};
