#!/usr/bin/env node
/**
 * Optimiza las imágenes del directorio a WebP para producción.
 *
 * - Convierte las imágenes de public/img/comercios/ (jpg/png) a WebP de alta calidad.
 * - Limita la anchura a 1000px (las tarjetas se ven a ~400px; sobra para retina) → menos peso.
 * - Actualiza src/data/comercios.json a la ruta .webp.
 * - Fallback: si una conversión falla o no reduce el peso, conserva el original y su ruta.
 *
 * Uso:  node scripts/optimizar-imagenes.mjs   (o: npm run optimize:imagenes)
 * Requiere "sharp" (ya disponible vía Astro).
 */
import sharp from 'sharp';
import { readFile, writeFile, stat, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_PATH = join(ROOT, 'src', 'data', 'comercios.json');
const PUBLIC = join(ROOT, 'public');

const MAX_WIDTH = 1000;
const QUALITY = 80;

const sizeOf = async (p) => { try { return (await stat(p)).size; } catch { return 0; } };
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';

async function main() {
  const comercios = JSON.parse(await readFile(JSON_PATH, 'utf8'));

  let antes = 0, despues = 0, convertidas = 0, omitidas = 0, fallos = 0;

  for (const c of comercios) {
    const ruta = c.imagen;
    if (!ruta || !ruta.startsWith('/img/comercios/')) continue;          // solo imágenes locales del directorio
    if (ruta.endsWith('.webp')) { despues += await sizeOf(join(PUBLIC, ruta)); continue; } // ya optimizada

    const srcAbs = join(PUBLIC, ruta);
    const pesoOrig = await sizeOf(srcAbs);
    if (!pesoOrig) { console.warn(`  ! ${c.slug}: original no encontrado, se deja como está`); continue; }

    const destRel = ruta.replace(extname(ruta), '.webp');
    const destAbs = join(PUBLIC, destRel);

    try {
      const meta = await sharp(srcAbs).metadata();
      let pipe = sharp(srcAbs).rotate();                                 // respeta orientación EXIF
      if (meta.width && meta.width > MAX_WIDTH) pipe = pipe.resize({ width: MAX_WIDTH });
      await pipe.webp({ quality: QUALITY, effort: 6 }).toFile(destAbs);

      const pesoWebp = await sizeOf(destAbs);

      // Fallback: si no mejora, descarta el webp y conserva el original.
      if (pesoWebp === 0 || pesoWebp >= pesoOrig) {
        await unlink(destAbs).catch(() => {});
        antes += pesoOrig; despues += pesoOrig; omitidas++;
        console.log(`  = ${c.slug}: WebP no reduce peso, se mantiene original (${kb(pesoOrig)})`);
        continue;
      }

      antes += pesoOrig; despues += pesoWebp; convertidas++;
      c.imagen = destRel;                                               // actualiza ruta en el JSON
      await unlink(srcAbs).catch(() => {});                             // elimina el original ya convertido
      console.log(`  ✓ ${c.slug}: ${kb(pesoOrig)} → ${kb(pesoWebp)}  (-${(100 * (1 - pesoWebp / pesoOrig)).toFixed(0)}%)`);
    } catch (e) {
      antes += pesoOrig; despues += pesoOrig; fallos++;
      console.warn(`  ! ${c.slug}: conversión fallida (${e.message}) — se conserva el original`);
    }
  }

  await writeFile(JSON_PATH, JSON.stringify(comercios, null, 2) + '\n', 'utf8');

  const reduccion = antes ? (100 * (1 - despues / antes)) : 0;
  console.log('\n──────── RESUMEN ────────');
  console.log(`Convertidas a WebP : ${convertidas}`);
  console.log(`Sin cambio (fallback): ${omitidas + fallos}  (no mejora: ${omitidas}, fallos: ${fallos})`);
  console.log(`Peso total ANTES   : ${mb(antes)}  (${antes.toLocaleString('es')} bytes)`);
  console.log(`Peso total DESPUÉS : ${mb(despues)}  (${despues.toLocaleString('es')} bytes)`);
  console.log(`Reducción          : ${reduccion.toFixed(1)} %`);
}

main().catch((e) => { console.error(e); process.exit(1); });
