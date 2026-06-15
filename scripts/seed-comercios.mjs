#!/usr/bin/env node
// Carga inicial de comercios en Supabase desde src/data/comercios.json.
// Útil una sola vez para arrancar el panel con los 81 comercios reales.
// Usa upsert por `slug` → es seguro re-ejecutarlo (no duplica).

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
    /* no .env: confiamos en variables del entorno */
  }
}

async function main() {
  await loadEnv();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (ver .env.example).');
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const json = await readFile(path.join(root, 'src/data/comercios.json'), 'utf8');
  const comercios = JSON.parse(json);

  console.log(`→ Cargando ${comercios.length} comercios en Supabase…`);

  const rows = comercios.map((c) => ({
    slug: c.slug,
    nombre: c.nombre,
    categoria: c.categoria || null,
    zona: c.zona || null,
    direccion: c.direccion || null,
    telefono: c.telefono || null,
    email: c.email || null,
    web: c.web || null,
    imagen: c.imagen || null,
    galeria_imagenes: [],
    destacado: false,
  }));

  // Lote en bloques de 100 para evitar payloads enormes.
  const CHUNK = 100;
  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const { error } = await sb.from('comercios').upsert(batch, { onConflict: 'slug' });
    if (error) {
      console.error('Error en lote', i, ':', error.message);
      process.exit(1);
    }
    done += batch.length;
    console.log(`  ✓ ${done}/${rows.length}`);
  }

  const { count } = await sb.from('comercios').select('id', { count: 'exact', head: true });
  console.log(`\nSeed OK. Total en Supabase: ${count ?? '?'} comercios.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
