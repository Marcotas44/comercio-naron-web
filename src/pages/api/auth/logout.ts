export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const supabase = createSupabaseServerClient(cookies, request);
  await supabase.auth.signOut();
  return redirect('/login', 303);
};

export const GET: APIRoute = () => new Response('Method Not Allowed', { status: 405 });
