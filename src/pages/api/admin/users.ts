export const prerender = false;

import type { APIRoute } from 'astro';
import { requireApiRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { getString, getRequired, FormError, flashRedirect } from '../../../lib/form';
import type { UserRole } from '../../../lib/supabase/types';

const ROLES: UserRole[] = ['editor', 'admin_asociacion', 'super_admin'];

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const guard = await requireApiRole(cookies, request, { min: 'super_admin' });
  if ('response' in guard) return guard.response;
  const me = guard.user;

  const fd = await request.formData();
  const action = getString(fd, '_action');
  const sb = supabaseAdmin();

  try {
    if (action === 'create') {
      const email = getRequired(fd, 'email');
      const password = getRequired(fd, 'password');
      const nombre = getString(fd, 'nombre');
      const role = (getString(fd, 'role') ?? 'editor') as UserRole;
      if (!ROLES.includes(role)) throw new FormError('Rol inválido.');
      if (password.length < 8) throw new FormError('La contraseña debe tener al menos 8 caracteres.');

      const { data, error } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: nombre ? { nombre } : undefined,
      });
      if (error || !data.user) throw new FormError(error?.message ?? 'No se ha podido crear el usuario.');

      // El trigger handle_new_user ya crea el profile. Actualizamos nombre/rol.
      await sb.from('profiles').update({ nombre, role }).eq('id', data.user.id);

      return redirect(flashRedirect('/admin/configuracion', `Usuario ${email} creado.`), 303);
    }

    if (action === 'role') {
      const id = getRequired(fd, 'id');
      const role = (getString(fd, 'role') ?? '') as UserRole;
      if (!ROLES.includes(role)) throw new FormError('Rol inválido.');
      if (id === me.id && role !== 'super_admin') {
        throw new FormError('No puedes quitarte tu propio rol de super_admin.');
      }
      const { error } = await sb.from('profiles').update({ role }).eq('id', id);
      if (error) throw new FormError(error.message);
      return redirect(flashRedirect('/admin/configuracion', 'Rol actualizado.'), 303);
    }

    if (action === 'delete') {
      const id = getRequired(fd, 'id');
      if (id === me.id) throw new FormError('No puedes eliminar tu propia cuenta.');
      const { error } = await sb.auth.admin.deleteUser(id);
      if (error) throw new FormError(error.message);
      return redirect(flashRedirect('/admin/configuracion', 'Usuario eliminado.'), 303);
    }

    throw new FormError('Acción no soportada.');
  } catch (e) {
    const msg = e instanceof FormError ? e.message : 'Error inesperado.';
    return redirect(flashRedirect('/admin/configuracion', msg, 'error'), 303);
  }
};
