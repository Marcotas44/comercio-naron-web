#!/usr/bin/env node
// Genera descripciones de comercios con Ollama local y las guarda en Supabase.
// Solo rellena las que están vacías o null. No sobrescribe descripciones existentes.
//
//   npm run gen:descripciones
//
// Variables (con valores por defecto):
//   OLLAMA_URL=http://localhost:11434/api/generate
//   OLLAMA_MODEL=mistral
// Usa SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del .env existente.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

async function loadEnv() {
  try {
    const text = await readFile(path.join(root, '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
      }
    }
  } catch {
    /* sin .env: usamos variables del entorno */
  }
}

const SYSTEM_PROMPT =
  'Responde únicamente en español. Genera una descripción profesional, cercana y ' +
  'comercial de entre 50 y 80 palabras para este comercio. No inventes servicios, ' +
  'horarios ni marcas. Usa únicamente los datos proporcionados.';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildPrompt(c) {
  const datos = [
    `Nombre: ${c.nombre}`,
    c.categoria && `Categoría: ${c.categoria}`,
    c.zona && `Zona: ${c.zona}`,
    c.direccion && `Dirección: ${c.direccion}`,
    c.web && `Web: ${c.web}`,
  ].filter(Boolean).join('\n');
  return `${SYSTEM_PROMPT}\n\nDatos del comercio:\n${datos}\n\nDescripción:`;
}

async function generar(ollamaUrl, model, c) {
  const res = await fetch(ollamaUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: buildPrompt(c),
      stream: false,
      options: { temperature: 0.7 },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Ollama HTTP ${res.status}${detail ? ' · ' + detail.slice(0, 160) : ''}`);
  }
  const data = await res.json();
  const texto = (data.response ?? '').trim();
  if (!texto) throw new Error(`Ollama no devolvió texto (¿modelo "${model}" instalado?)`);
  return texto;
}

async function main() {
  await loadEnv();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434/api/generate';
  const model = process.env.OLLAMA_MODEL ?? 'mistral';

  if (!url || !key) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (ver .env.example).');
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log('→ Leyendo comercios de Supabase…');
  const { data: comercios, error } = await sb
    .from('comercios')
    .select('id, nombre, categoria, zona, direccion, web, descripcion')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error consultando Supabase:', error.message);
    process.exit(1);
  }

  const total = comercios.length;
  console.log(`→ ${total} comercios. Generando solo los que no tienen descripción.\n`);
  console.log(`   Ollama: ${ollamaUrl} · modelo: ${model}\n`);

  let generadas = 0;
  let saltadas = 0;
  let errores = 0;

  for (let i = 0; i < total; i++) {
    const c = comercios[i];
    const pos = `${i + 1}/${total}`;

    if (c.descripcion && c.descripcion.trim()) {
      saltadas++;
      console.log(`${pos} Saltado (ya tiene descripción): ${c.nombre}`);
      continue;
    }

    process.stdout.write(`${pos} Generando ${c.nombre}... `);
    try {
      const descripcion = await generar(ollamaUrl, model, c);
      const { error: upErr } = await sb.from('comercios').update({ descripcion }).eq('id', c.id);
      if (upErr) throw new Error('Supabase: ' + upErr.message);
      generadas++;
      console.log('Guardado OK');
    } catch (e) {
      errores++;
      console.log('ERROR: ' + (e instanceof Error ? e.message : String(e)));
    }

    // Espera 1s entre comercios para no saturar el Mac (salvo tras el último).
    if (i < total - 1) await sleep(1000);
  }

  console.log('\n── Resumen ───────────────');
  console.log(`  Generadas: ${generadas}`);
  console.log(`  Saltadas:  ${saltadas}`);
  console.log(`  Errores:   ${errores}`);
  console.log('──────────────────────────');
  console.log('\nRecuerda: ejecuta `npm run sync:comercios` y despliega para reflejarlo en la web pública.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
