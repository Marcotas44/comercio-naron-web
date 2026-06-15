import { defineMiddleware, sequence } from 'astro:middleware';
import { getSessionUser } from './lib/auth';

/**
 * Middleware de sesión.
 *
 * - Resuelve el usuario a partir de las cookies y lo deja en Astro.locals.user.
 * - Protege /admin/*: si no hay sesión, redirige a /login?redirect=<ruta>.
 * - Protege /api/admin/*: si no hay sesión, devuelve 401 JSON.
 * - Si ya hay sesión y se entra en /login, redirige a /admin.
 */
const sessionMiddleware = defineMiddleware(async (context, next) => {
  const { url, cookies, locals, redirect, request } = context;
  const pathname = url.pathname;

  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminApi = pathname.startsWith('/api/admin/');
  const isAuthApi = pathname.startsWith('/api/auth/');
  const isLogin = pathname === '/login';

  // Para rutas que no necesitan sesión, dejamos pasar sin tocar locals.
  if (!isAdminPage && !isAdminApi && !isAuthApi && !isLogin) {
    locals.user = null;
    return next();
  }

  const user = await getSessionUser(cookies, request);
  locals.user = user;

  if (isLogin && user) {
    return redirect('/admin');
  }

  if (isAdminPage && !user) {
    const target = pathname + (url.search ?? '');
    return redirect(`/login?redirect=${encodeURIComponent(target)}`);
  }

  if (isAdminApi && !user) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return next();
});

export const onRequest = sequence(sessionMiddleware);
