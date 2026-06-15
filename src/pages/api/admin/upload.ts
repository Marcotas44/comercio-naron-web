export const prerender = false;

import type { APIRoute } from 'astro';
import { requireApiRole } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';

const BUCKET = 'media';
const ALLOWED_FOLDERS = /^(comercios|noticias|campanas)\/[a-zA-Z0-9_-]+$/;
const MAX_SIZE = 10 * 1024 * 1024;
// Lista blanca explícita. SVG queda EXCLUIDO (riesgo de XSS almacenado).
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const POST: APIRoute = async ({ request, cookies }) => {
  const guard = await requireApiRole(cookies, request, { min: 'editor' });
  if ('response' in guard) return guard.response;

  const fd = await request.formData();
  const file = fd.get('file');
  const folder = String(fd.get('folder') ?? '').trim();

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'No se ha enviado ningún archivo.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (file.size === 0) {
    return new Response(JSON.stringify({ error: 'Archivo vacío.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (file.size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: 'El archivo supera 10 MB.' }), { status: 413, headers: { 'Content-Type': 'application/json' } });
  }
  if (!folder || !ALLOWED_FOLDERS.test(folder)) {
    return new Response(JSON.stringify({ error: 'Carpeta destino inválida.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return new Response(JSON.stringify({ error: 'Tipo no permitido. Solo JPEG, PNG o WebP.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const safeName = file.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const ts = Date.now();
  const path = `${folder}/${ts}-${safeName || 'archivo'}`;

  const sb = supabaseAdmin();
  const buffer = await file.arrayBuffer();
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return new Response(JSON.stringify({ url: data.publicUrl, path }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
