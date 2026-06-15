export const prerender = false;

import type { APIRoute } from 'astro';
import { requireApiRole } from '../../../../../lib/auth';
import { supabaseAdmin } from '../../../../../lib/supabase/admin';
import { flashRedirect } from '../../../../../lib/form';
import { triggerDeploy } from '../../../../../lib/deploy';

export const POST: APIRoute = async ({ params, cookies, redirect, request }) => {
  const guard = await requireApiRole(cookies, request, { min: 'admin_asociacion' });
  if ('response' in guard) return guard.response;
  const { id } = params;
  if (!id) return redirect(flashRedirect('/admin/campanas', 'ID inválido.', 'error'), 303);

  const sb = supabaseAdmin();
  const { error } = await sb.from('campanas').delete().eq('id', id);
  if (error) return redirect(flashRedirect(`/admin/campanas/${id}`, error.message, 'error'), 303);
  const deployed = await triggerDeploy();
  return redirect(flashRedirect('/admin/campanas', 'Campaña eliminada.' + (deployed ? ' La web pública se actualizará en unos minutos.' : '')), 303);
};
