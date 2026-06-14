#!/usr/bin/env node
/**
 * Importador del directorio real de la Asociación de Comerciantes de Narón.
 *
 * Origen: https://comerciodenaron.com  (WordPress, CPT "Comercio").
 * No inventa datos: extrae únicamente lo publicado en la web oficial.
 *
 * Flujo:
 *   1. Pagina /listado-de-comercios/page/N/  -> todos los slugs de comercio.
 *   2. Recorre los archivos de sector (/categoría-de-comercios/<x>/) y de
 *      zona (/ubicación/<x>/) para saber a qué categoría y zona pertenece cada uno.
 *   3. Abre cada ficha /Comercio/<slug>/ y extrae: nombre, dirección, teléfono,
 *      email, web e imagen.
 *   4. Escribe src/data/comercios.json
 *
 * Uso:   node scripts/import-comercios.mjs
 * Requiere Node 18+ (fetch global). Sin dependencias externas.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = 'https://comerciodenaron.com';
const UA = { 'User-Agent': 'Mozilla/5.0 (import-comercios; +asociacion)' };
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'comercios.json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getHtml(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch (e) {
      if (i === tries - 1) { console.warn('  ! fallo', url, e.message); return null; }
      await sleep(600);
    }
  }
}

const decode = (s = '') => s
  .replace(/&#8211;/g, '–').replace(/&#8217;/g, '’').replace(/&#038;|&amp;/g, '&')
  .replace(/&#8220;|&#8221;/g, '"').replace(/&aacute;/g, 'á').replace(/&iacute;/g, 'í')
  .replace(/&oacute;/g, 'ó').replace(/&eacute;/g, 'é').replace(/&uacute;/g, 'ú')
  .replace(/&ntilde;/g, 'ñ').replace(/&nbsp;/g, ' ').replace(/&#?\w+;/g, ' ').trim();

const stripTags = (h) => decode(h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));

const titleOf = (html) => {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  if (!m) return '';
  return decode(m[1]).replace(/\s*[–—-]\s*Comercio de Narón\s*$/i, '').trim();
};

const slugsFrom = (html) => {
  const set = new Set();
  for (const m of html.matchAll(/\/Comercio\/([^"'\/\s?#]+)/g)) set.add(m[1]);
  return [...set];
};

// Pool de concurrencia simple
async function mapPool(items, limit, fn) {
  const out = []; let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  });
  await Promise.all(workers);
  return out;
}

// ---------- 1. Todos los slugs (paginación) ----------
async function getAllSlugs() {
  const all = new Set();
  for (let page = 1; page <= 30; page++) {
    const url = page === 1 ? `${BASE}/listado-de-comercios/` : `${BASE}/listado-de-comercios/page/${page}/`;
    const html = await getHtml(url);
    if (!html) break;
    const slugs = slugsFrom(html);
    if (slugs.length === 0) break;
    const before = all.size;
    slugs.forEach((s) => all.add(s));
    process.stdout.write(`  · página ${page}: ${slugs.length} comercios (total ${all.size})\n`);
    if (all.size === before) break; // no hay nuevos -> fin
  }
  return [...all];
}

// ---------- 2. Mapas slug -> categoría / zona ----------
async function buildTaxonomyMap(indexPath, archivePrefix) {
  const idx = await getHtml(`${BASE}/${indexPath}/`);
  const termSlugs = [...new Set(
    [...(idx || '').matchAll(new RegExp(`${archivePrefix}/([^"'\\/\\s?#]+)`, 'g'))].map((m) => m[1])
  )];
  const map = {}; // slugComercio -> [labels]
  for (const term of termSlugs) {
    const html = await getHtml(`${BASE}/${archivePrefix}/${term}/`);
    if (!html) continue;
    const label = titleOf(html) || term;
    for (const cs of slugsFrom(html)) (map[cs] ||= []).push(label);
  }
  return map;
}

// ---------- 3. Parseo de una ficha ----------
function parseFicha(html) {
  const nombre = titleOf(html);
  // Bloque "Información de contacto" ... hasta "Etiqueta" o "Comercios similares"
  const block = (html.match(/Información de contacto(.*?)(Etiqueta|Comercios similares|Comparte)/is) || [])[1] || '';
  const text = stripTags(block);

  // Dirección: desde el inicio del bloque hasta "España" (o hasta el primer teléfono)
  let direccion = '';
  const addr = text.match(/^(.*?\bEspaña)/i) || text.match(/^(.*?\d{5}[^0-9]*?Narón)/i);
  if (addr) direccion = addr[1].trim();

  // Teléfono (formato español, 9 dígitos con o sin espacios) dentro del bloque
  let telefono = '';
  const tel = text.replace(direccion, '').match(/\b((?:\+34\s?)?[6789]\d{2}[\s.]?\d{3}[\s.]?\d{3})\b/);
  if (tel) telefono = tel[1].replace(/\s+/g, ' ').trim();

  // Email dentro del bloque (evita los genéricos de la asociación)
  let email = '';
  const mails = [...text.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)]
    .map((m) => m[0]).filter((e) => !/acnaron@|acn@comerciodenaron/i.test(e));
  if (mails.length) email = mails[0];

  // Web dentro del bloque (excluye el propio dominio de la asociación)
  let web = '';
  const webm = [...text.matchAll(/https?:\/\/[^\s"'<)]+/gi)]
    .map((m) => m[0]).filter((u) => !/comerciodenaron\.com/i.test(u));
  if (webm.length) web = webm[0].replace(/%20/g, '').replace(/\s+/g, '').replace(/[.,;]+$/, '');
  if (email) email = email.replace(/%20/g, '').replace(/\s+/g, '').trim();

  // Imagen propia: primera imagen de uploads antes de "Comercios similares", sin logos
  let imagen = '';
  const main = html.split(/Comercios similares/i)[0];
  const imgs = [...main.matchAll(/https?:\/\/[^"'\s)]*wp-content\/uploads\/[^"'\s)]+\.(?:jpe?g|png|webp)/gi)]
    .map((m) => m[0])
    .filter((u) => !/(logo|cropped|icon|mini|\d{2,4}x\d{2,4}|Naron-1024)/i.test(u));
  if (imgs.length) imagen = imgs[0];

  return { nombre, direccion, telefono, email, web, imagen };
}

// ---------- Orquestación ----------
async function main() {
  console.log('1) Recopilando slugs del listado paginado…');
  const slugs = await getAllSlugs();
  console.log(`   -> ${slugs.length} comercios encontrados.\n`);

  console.log('2) Mapeando sectores y zonas…');
  const catMap = await buildTaxonomyMap('listado-por-sectores', 'categoría-de-comercios');
  const zonaMap = await buildTaxonomyMap('listado-por-zonas', 'ubicación');
  console.log(`   -> ${Object.keys(catMap).length} con categoría, ${Object.keys(zonaMap).length} con zona.\n`);

  console.log('3) Descargando y procesando fichas…');
  let done = 0;
  const comercios = await mapPool(slugs, 6, async (slug) => {
    const html = await getHtml(`${BASE}/Comercio/${slug}/`);
    done++;
    if (!html) { console.warn(`   ! sin ficha: ${slug}`); return null; }
    const f = parseFicha(html);
    if (done % 10 === 0) process.stdout.write(`   · ${done}/${slugs.length}\n`);
    return {
      slug,
      nombre: f.nombre || slug,
      categoria: (catMap[slug] || [])[0] || '',
      zona: (zonaMap[slug] || [])[0] || '',
      direccion: f.direccion || '',
      telefono: f.telefono || '',
      email: f.email || '',
      web: f.web || '',
      imagen: f.imagen || '',
    };
  });

  const data = comercios.filter(Boolean).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data, null, 2) + '\n', 'utf8');

  // Resumen
  const con = (k) => data.filter((c) => c[k]).length;
  console.log(`\n✅ Guardados ${data.length} comercios en src/data/comercios.json`);
  console.log(`   con categoría: ${con('categoria')} · zona: ${con('zona')} · dirección: ${con('direccion')}`);
  console.log(`   teléfono: ${con('telefono')} · email: ${con('email')} · web: ${con('web')} · imagen: ${con('imagen')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
