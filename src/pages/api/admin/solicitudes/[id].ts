export const prerender = false;

import type { APIRoute } from 'astro';
import { requireApiRole } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { getString, flashRedirect } from '../../../../lib/form';

const ESTADOS = ['pendiente', 'contactado', 'aceptado', 'rechazado'] as const;
type Estado = (typeof ESTADOS)[number];

export const POST: APIRoute = async ({ request, params, cookies, redirect }) => {
  const guard = await requireApiRole(cookies, request, { min: 'admin_asociacion' });
  if ('response' in guard) return guard.response;
  const user = guard.user;

  const { id } = params;
  if (!id) return new Response('Bad Request', { status: 400 });
  const fd = await request.formData();
  const action = getString(fd, '_action');

  const sb = supabaseAdmin();
  if (action === 'estado') {
    const estado = getString(fd, 'estado') as Estado | null;
    if (!estado || !ESTADOS.includes(estado)) {
      return redirect(flashRedirect(`/admin/solicitudes/${id}`, 'Estado inválido.', 'error'), 303);
    }
    const { error } = await sb
      .from('solicitudes_socio')
      .update({ estado, attended_by: user.id })
      .eq('id', id);
    if (error) return redirect(flashRedirect(`/admin/solicitudes/${id}`, error.message, 'error'), 303);
    return redirect(flashRedirect(`/admin/solicitudes/${id}`, `Solicitud marcada como "${estado}".`), 303);
  }

  if (action === 'notas') {
    const notas = getString(fd, 'notas_internas');
    const { error } = await sb.from('solicitudes_socio').update({ notas_internas: notas }).eq('id', id);
    if (error) return redirect(flashRedirect(`/admin/solicitudes/${id}`, error.message, 'error'), 303);
    return redirect(flashRedirect(`/admin/solicitudes/${id}`, 'Notas guardadas.'), 303);
  }

  return redirect(flashRedirect(`/admin/solicitudes/${id}`, 'Acción no soportada.', 'error'), 303);
};
