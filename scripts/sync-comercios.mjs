#!/usr/bin/env node
// Exporta los comercios de Supabase a src/data/comercios.json.
// El sitio público lee de este JSON en build time → rendimiento estático.
// Ejecutar tras editar comercios desde /admin y antes de desplegar.

import { writeFile, readFile } from 'node:fs/promises';
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
    /* no .env */
  }
}

async function main() {
  await loadEnv();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY (ver .env.example).');
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  console.log('→ Descargando comercios de Supabase…');

  const { data, error } = await sb
    .from('comercios')
    .select('slug, nombre, categoria, zona, direccion, telefono, email, web, logo, imagen, descripcion, horario, whatsapp, instagram, facebook')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error consultando Supabase:', error.message);
    process.exit(1);
  }
  if (!data) {
    console.error('No se recibieron datos.');
    process.exit(1);
  }

  // Mantener el formato exacto del JSON existente (compatible con src/data/comercios.ts).
  const rows = data.map((c) => ({
    slug: c.slug,
    nombre: c.nombre,
    categoria: c.categoria ?? '',
    zona: c.zona ?? '',
    direccion: c.direccion ?? '',
    telefono: c.telefono ?? '',
    email: c.email ?? '',
    web: c.web ?? '',
    imagen: c.logo ?? c.imagen ?? '',
    logo: c.logo ?? '',
    descripcion: c.descripcion ?? '',
    horario: c.horario ?? '',
    whatsapp: c.whatsapp ?? '',
    instagram: c.instagram ?? '',
    facebook: c.facebook ?? '',
  }));

  const out = path.join(root, 'src/data/comercios.json');
  await writeFile(out, JSON.stringify(rows, null, 2) + '\n', 'utf8');
  console.log(`✓ Escrito ${rows.length} comercios en ${path.relative(root, out)}`);
  console.log('  Recuerda ejecutar también `npm run dims:imagenes` si has añadido imágenes nuevas.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
