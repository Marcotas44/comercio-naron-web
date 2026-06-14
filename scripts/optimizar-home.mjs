#!/usr/bin/env node
/**
 * Optimiza a WebP las imágenes de portada/secciones (public/img/*.jpg|png),
 * NO toca public/img/comercios/ (ya optimizado por optimizar-imagenes.mjs).
 *
 * - Convierte con sharp (calidad alta, anchura máx. según rol).
 * - Reescribe automáticamente las rutas /img/<name>.<ext> -> .webp en src/.
 * - Fallback: si una conversión falla o no reduce peso, conserva el original y su ruta.
 *
 * Uso:  node scripts/optimizar-home.mjs   (o: npm run optimize:home)
 */
import sharp from 'sharp';
import { readFile, writeFile, readdir, stat, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, basename } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = join(ROOT, 'public', 'img');
const SRC_DIR = join(ROOT, 'src');

const QUALITY = 80;
// Anchura máxima por rol (solo reduce, nunca amplía)
const MAX_WIDTH = (name) => {
  if (/^(hero|escaparate|evento)$/.test(name)) return 1600;   // héroes a pantalla completa
  if (/^testimonio|^presidenta/.test(name)) return 600;        // retratos
  return 1200;                                                 // tarjetas / secciones
};

const sizeOf = async (p) => { try { return (await stat(p)).size; } catch { return 0; } };
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';

async function listImages(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isFile() && /\.(jpe?g|png)$/i.test(e.name)) out.push(e.name);
  }
  return out.sort();
}

async function walk(dir) {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files.push(...await walk(p));
    else if (/\.(astro|ts|js|mjs)$/.test(e.name)) files.push(p);
  }
  return files;
}

async function main() {
  const images = await listImages(IMG_DIR);
  let antes = 0, despues = 0, convertidas = 0, omitidas = 0, fallos = 0;
  const renames = []; // { from: 'hero.jpg', to: 'hero.webp' }

  for (const file of images) {
    const name = basename(file, extname(file));
    const srcAbs = join(IMG_DIR, file);
    const pesoOrig = await sizeOf(srcAbs);
    const destAbs = join(IMG_DIR, `${name}.webp`);

    try {
      const meta = await sharp(srcAbs).metadata();
      let pipe = sharp(srcAbs).rotate();
      const max = MAX_WIDTH(name);
      if (meta.width && meta.width > max) pipe = pipe.resize({ width: max });
      await pipe.webp({ quality: QUALITY, effort: 6 }).toFile(destAbs);
      const pesoWebp = await sizeOf(destAbs);

      if (pesoWebp === 0 || pesoWebp >= pesoOrig) {
        await unlink(destAbs).catch(() => {});
        antes += pesoOrig; despues += pesoOrig; omitidas++;
        console.log(`  = ${file}: WebP no reduce peso, se mantiene original (${kb(pesoOrig)})`);
        continue;
      }

      antes += pesoOrig; despues += pesoWebp; convertidas++;
      await unlink(srcAbs).catch(() => {});
      renames.push({ from: file, to: `${name}.webp` });
      console.log(`  ✓ ${file} → ${name}.webp: ${kb(pesoOrig)} → ${kb(pesoWebp)}  (-${(100 * (1 - pesoWebp / pesoOrig)).toFixed(0)}%)`);
    } catch (e) {
      antes += pesoOrig; despues += pesoOrig; fallos++;
      console.warn(`  ! ${file}: conversión fallida (${e.message}) — se conserva el original`);
    }
  }

  // Reescribir rutas en el código fuente (solo las convertidas)
  if (renames.length) {
    const srcFiles = await walk(SRC_DIR);
    let editados = 0;
    for (const f of srcFiles) {
      let txt = await readFile(f, 'utf8');
      const before = txt;
      for (const { from, to } of renames) {
        txt = txt.split(`/img/${from}`).join(`/img/${to}`);
      }
      if (txt !== before) { await writeFile(f, txt, 'utf8'); editados++; }
    }
    console.log(`\n  Rutas actualizadas en ${editados} archivo(s) de src/.`);
  }

  const reduccion = antes ? (100 * (1 - despues / antes)) : 0;
  console.log('\n──────── RESUMEN (home) ────────');
  console.log(`Convertidas a WebP : ${convertidas}`);
  console.log(`Sin cambio (fallback): ${omitidas + fallos}  (no mejora: ${omitidas}, fallos: ${fallos})`);
  console.log(`Peso total ANTES   : ${mb(antes)}  (${antes.toLocaleString('es')} bytes)`);
  console.log(`Peso total DESPUÉS : ${mb(despues)}  (${despues.toLocaleString('es')} bytes)`);
  console.log(`Reducción          : ${reduccion.toFixed(1)} %`);
}

main().catch((e) => { console.error(e); process.exit(1); });
