#!/usr/bin/env node
/**
 * Detecta las dimensiones reales (ancho × alto) de cada imagen de public/img
 * (incluyendo public/img/comercios/) y genera src/data/img-dims.json:
 *
 *   { "/img/hero.webp": { "w": 1600, "h": 1000 }, ... }
 *
 * Las páginas leen ese mapa para poner width/height en los <img> y eliminar el CLS.
 *
 * Uso:  node scripts/dimensiones-imagenes.mjs   (o: npm run dims:imagenes)
 */
import sharp from 'sharp';
import { readdir, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = join(ROOT, 'public', 'img');
const PUBLIC = join(ROOT, 'public');
const OUT = join(ROOT, 'src', 'data', 'img-dims.json');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (/\.(webp|jpe?g|png|avif)$/i.test(e.name)) out.push(p);
  }
  return out;
}

async function main() {
  const files = (await walk(IMG_DIR)).sort();
  const dims = {};
  const filas = [];
  for (const abs of files) {
    const publicPath = '/' + relative(PUBLIC, abs).split(/[\\/]/).join('/');
    try {
      const m = await sharp(abs).metadata();
      // sharp ya respeta la orientación EXIF en width/height
      dims[publicPath] = { w: m.width, h: m.height };
      const kb = ((await stat(abs)).size / 1024).toFixed(0);
      filas.push(`  ${publicPath}  →  ${m.width}×${m.height}  (${kb} KB)`);
    } catch (e) {
      console.warn(`  ! ${publicPath}: ${e.message}`);
    }
  }
  await writeFile(OUT, JSON.stringify(dims, null, 2) + '\n', 'utf8');
  console.log(filas.join('\n'));
  console.log(`\n✅ ${Object.keys(dims).length} imágenes medidas → src/data/img-dims.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
