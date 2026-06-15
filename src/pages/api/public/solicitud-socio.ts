export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAnon } from '../../../lib/supabase/public';

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
  // Acepta JSON (el formulario envía con fetch) o form-urlencoded como respaldo.
  let body: Record<string, unknown> = {};
  const ct = request.headers.get('content-type') ?? '';
  try {
    if (ct.includes('application/json')) {
      body = await request.json();
    } else {
      const fd = await request.formData();
      body = Object.fromEntries(fd.entries());
    }
  } catch {
    return jsonError('Datos no válidos.');
  }

  const str = (k: string) => String(body[k] ?? '').trim();

  // Honeypot anti-spam: si el campo oculto viene relleno, lo tratamos como bot
  // pero respondemos OK para no dar pistas.
  if (str('website')) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const nombre = str('nombre');
  const comercio = str('comercio');
  const categoria = str('categoria');
  const telefono = str('telefono');
  const email = str('email');
  const direccion = str('direccion');
  const mensaje = str('mensaje');

  // Campos obligatorios
  if (!nombre || !comercio || !telefono || !email) {
    return jsonError('Faltan campos obligatorios (nombre, comercio, teléfono y email).');
  }
  if (!EMAIL_RE.test(email)) {
    return jsonError('El email no tiene un formato válido.');
  }

  const sb = supabaseAnon();
  const { error } = await sb.from('solicitudes_socio').insert({
    nombre,
    comercio,
    categoria: categoria || null,
    telefono,
    email,
    direccion: direccion || null,
    mensaje: mensaje || null,
    estado: 'pendiente',
  });

  if (error) {
    return jsonError('No se ha podido registrar la solicitud. Inténtalo de nuevo.', 500);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET: APIRoute = () => new Response('Method Not Allowed', { status: 405 });
