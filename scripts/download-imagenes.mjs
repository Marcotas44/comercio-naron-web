#!/usr/bin/env node
/**
 * Descarga las imágenes reales de los comercios a public/img/comercios/<slug>.<ext>
 * y reescribe src/data/comercios.json para que apunten a la ruta local.
 *
 * - Ignora el placeholder oficial "unnamed.jpg" (IMAGEN NO DISPONIBLE): esos
 *   comercios quedan sin imagen y conservan el placeholder de la web.
 * - No descarga duplicados (cachea por URL de origen).
 * - Conserva la extensión real (.jpg, .png, .webp).
 *
 * Uso:  node scripts/download-imagenes.mjs   (o: npm run import:imagenes)
 * Requiere Node 18+ (fetch global), sin dependencias.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_PATH = join(ROOT, 'src', 'data', 'comercios.json');
const IMG_DIR = join(ROOT, 'public', 'img', 'comercios');
const PUBLIC_BASE = '/img/comercios';

// Imágenes a tratar como "sin imagen" (placeholders del sitio de origen)
const PLACEHOLDERS = [/\/unnamed\.jpg$/i];

const UA = { 'User-Agent': 'Mozilla/5.0 (download-imagenes; +asociacion)' };

const extFrom = (url) => {
  const m = url.toLowerCase().match(/\.(jpe?g|png|webp)(?:\?|$)/);
  const e = m ? m[1] : 'jpg';
  return e === 'jpeg' ? 'jpg' : e;
};

async function main() {
  const comercios = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(JSON_PATH, 'utf8')));
  await mkdir(IMG_DIR, { recursive: true });

  const cache = new Map(); // urlOrigen -> rutaPublica
  let descargadas = 0, placeholders = 0, sin = 0, reutilizadas = 0;

  for (const c of comercios) {
    const url = c.imagen;
    if (!url) { sin++; continue; }

    if (PLACEHOLDERS.some((re) => re.test(url))) {
      c.imagen = '';                 // mantiene el placeholder de la web
      placeholders++;
      continue;
    }

    if (cache.has(url)) {            // no descargar duplicados
      c.imagen = cache.get(url);
      reutilizadas++;
      continue;
    }

    const ext = extFrom(url);
    const fileName = `${c.slug}.${ext}`;
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) throw new Error('archivo demasiado pequeño (' + buf.length + 'b)');
      await writeFile(join(IMG_DIR, fileName), buf);
      const ruta = `${PUBLIC_BASE}/${fileName}`;
      c.imagen = ruta;
      cache.set(url, ruta);
      descargadas++;
      console.log(`  ✓ ${fileName}  (${(buf.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.warn(`  ! ${c.slug}: ${e.message} — se deja sin imagen`);
      c.imagen = '';
    }
  }

  await writeFile(JSON_PATH, JSON.stringify(comercios, null, 2) + '\n', 'utf8');
  console.log(`\n✅ Descargadas ${descargadas} imágenes únicas en public/img/comercios/`);
  console.log(`   placeholder ignorado: ${placeholders} · duplicadas reutilizadas: ${reutilizadas} · ya sin imagen: ${sin}`);
  console.log(`   comercios con imagen local: ${comercios.filter((c) => c.imagen).length} / ${comercios.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
