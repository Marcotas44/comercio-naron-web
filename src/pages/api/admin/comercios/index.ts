export const prerender = false;

import type { APIRoute } from 'astro';
import { requireApiRole } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { getString, getRequired, getBool, getStringArray, FormError, flashRedirect } from '../../../../lib/form';
import { slugify } from '../../../../lib/slug';
import { triggerDeploy } from '../../../../lib/deploy';

const DEPLOY_MSG = ' La web pública se actualizará en unos minutos.';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const guard = await requireApiRole(cookies, request, { min: 'admin_asociacion' });
  if ('response' in guard) return guard.response;

  const fd = await request.formData();
  const id = getString(fd, 'id');

  try {
    const nombre = getRequired(fd, 'nombre');
    const slugRaw = getString(fd, 'slug');
    const slug = slugify(slugRaw ?? nombre);
    if (!slug) throw new FormError('El slug es obligatorio.');

    const payload = {
      nombre,
      slug,
      categoria: getString(fd, 'categoria'),
      zona: getString(fd, 'zona'),
      direccion: getString(fd, 'direccion'),
      telefono: getString(fd, 'telefono'),
      email: getString(fd, 'email'),
      web: getString(fd, 'web'),
      descripcion: getString(fd, 'descripcion'),
      horario: getString(fd, 'horario'),
      destacado: getBool(fd, 'destacado'),
      logo: getString(fd, 'logo'),
      galeria_imagenes: getStringArray(fd, 'galeria_imagenes'),
    };

    const sb = supabaseAdmin();

    if (id) {
      const { error } = await sb.from('comercios').update(payload).eq('id', id);
      if (error) throw new FormError(error.message);
      const deployed = await triggerDeploy();
      return redirect(flashRedirect('/admin/comercios', `Comercio "${nombre}" actualizado.` + (deployed ? DEPLOY_MSG : '')), 303);
    }

    const { error } = await sb.from('comercios').insert(payload);
    if (error) {
      if (error.code === '23505') throw new FormError('Ya existe un comercio con ese slug. Cámbialo.');
      throw new FormError(error.message);
    }
    const deployed = await triggerDeploy();
    return redirect(flashRedirect('/admin/comercios', `Comercio "${nombre}" creado.` + (deployed ? DEPLOY_MSG : '')), 303);
  } catch (e) {
    const msg = e instanceof FormError ? e.message : 'Error inesperado al guardar.';
    return redirect(flashRedirect(id ? `/admin/comercios/${id}` : '/admin/comercios/nuevo', msg, 'error'), 303);
  }
};
