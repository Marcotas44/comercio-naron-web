export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

function safeRedirect(target: string | null): string {
  if (!target) return '/admin';
  if (!target.startsWith('/')) return '/admin';
  if (target.startsWith('//')) return '/admin';
  return target;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const next = safeRedirect(String(form.get('redirect') ?? '/admin'));

  if (!email || !password) {
    const url = new URL('/login', request.url);
    url.searchParams.set('error', 'Introduce email y contraseña.');
    url.searchParams.set('redirect', next);
    if (email) url.searchParams.set('email', email);
    return redirect(url.pathname + url.search, 303);
  }

  const supabase = createSupabaseServerClient(cookies, request);
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const url = new URL('/login', request.url);
    url.searchParams.set('error', 'Credenciales incorrectas o usuario inactivo.');
    url.searchParams.set('redirect', next);
    url.searchParams.set('email', email);
    return redirect(url.pathname + url.search, 303);
  }

  return redirect(next, 303);
};

export const GET: APIRoute = () => new Response('Method Not Allowed', { status: 405 });
