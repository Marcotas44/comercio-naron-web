export const prerender = false;

import type { APIRoute } from 'astro';
import { requireApiRole } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { getString, getRequired, getBool, FormError, flashRedirect } from '../../../../lib/form';
import { slugify } from '../../../../lib/slug';
import { triggerDeploy } from '../../../../lib/deploy';

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

    const fecha_publicacion_raw = getString(fd, 'fecha_publicacion');
    const fecha_publicacion = fecha_publicacion_raw ? new Date(fecha_publicacion_raw).toISOString() : null;

    const payload = {
      titulo,
      slug,
      resumen: getString(fd, 'resumen'),
      contenido: getString(fd, 'contenido'),
      imagen: getString(fd, 'imagen'),
      fecha_publicacion,
      autor: getString(fd, 'autor'),
      publicado: getBool(fd, 'publicado'),
    };

    const sb = supabaseAdmin();
    if (id) {
      const { error } = await sb.from('noticias').update(payload).eq('id', id);
      if (error) throw new FormError(error.message);
      const deployed = await triggerDeploy();
      return redirect(flashRedirect('/admin/noticias', `Noticia "${titulo}" actualizada.` + (deployed ? DEPLOY_MSG : '')), 303);
    }

    const { error } = await sb.from('noticias').insert(payload);
    if (error) {
      if (error.code === '23505') throw new FormError('Ya existe una noticia con ese slug.');
      throw new FormError(error.message);
    }
    const deployed = await triggerDeploy();
    return redirect(flashRedirect('/admin/noticias', `Noticia "${titulo}" creada.` + (deployed ? DEPLOY_MSG : '')), 303);
  } catch (e) {
    const msg = e instanceof FormError ? e.message : 'Error inesperado al guardar.';
    return redirect(flashRedirect(id ? `/admin/noticias/${id}` : '/admin/noticias/nueva', msg, 'error'), 303);
  }
};
