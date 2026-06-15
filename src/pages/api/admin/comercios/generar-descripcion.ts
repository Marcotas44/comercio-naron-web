export const prerender = false;

import type { APIRoute } from 'astro';
import { requireApiRole } from '../../../../lib/auth';

// Ollama local. Configurable por entorno, pero por defecto el endpoint local.
const OLLAMA_URL = import.meta.env.OLLAMA_URL ?? 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = import.meta.env.OLLAMA_MODEL ?? 'mistral';

const SYSTEM_PROMPT =
  'Responde únicamente en español. Genera una descripción profesional, cercana y ' +
  'comercial de entre 50 y 80 palabras para este comercio. No inventes servicios, ' +
  'horarios ni marcas. Usa únicamente los datos proporcionados.';

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const guard = await requireApiRole(cookies, request, { min: 'editor' });
  if ('response' in guard) return guard.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Cuerpo JSON inválido.');
  }

  const nombre = String(body.nombre ?? '').trim();
  const categoria = String(body.categoria ?? '').trim();
  const zona = String(body.zona ?? '').trim();
  const direccion = String(body.direccion ?? '').trim();
  const web = String(body.web ?? '').trim();

  if (!nombre) {
    return jsonError('El nombre del comercio es obligatorio para generar la descripción.');
  }

  // Solo incluimos los datos que existen, para que el modelo no invente.
  const datos = [
    `Nombre: ${nombre}`,
    categoria && `Categoría: ${categoria}`,
    zona && `Zona: ${zona}`,
    direccion && `Dirección: ${direccion}`,
    web && `Web: ${web}`,
  ].filter(Boolean).join('\n');

  const prompt = `${SYSTEM_PROMPT}\n\nDatos del comercio:\n${datos}\n\nDescripción:`;

  let ollamaRes: Response;
  try {
    ollamaRes = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.7 },
      }),
    });
  } catch {
    return jsonError(
      'No se ha podido conectar con Ollama. Comprueba que está en marcha en ' + OLLAMA_URL + '.',
      502,
    );
  }

  if (!ollamaRes.ok) {
    const detail = await ollamaRes.text().catch(() => '');
    return jsonError(
      `Ollama respondió con error ${ollamaRes.status}.${detail ? ' ' + detail.slice(0, 200) : ''}`,
      502,
    );
  }

  let data: { response?: string };
  try {
    data = await ollamaRes.json();
  } catch {
    return jsonError('Respuesta de Ollama no válida.', 502);
  }

  const descripcion = (data.response ?? '').trim();
  if (!descripcion) {
    return jsonError('Ollama no devolvió ninguna descripción. ¿Está el modelo "' + OLLAMA_MODEL + '" instalado?', 502);
  }

  return new Response(JSON.stringify({ descripcion }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET: APIRoute = () => new Response('Method Not Allowed', { status: 405 });
