# Comercio de Narón — Web (Astro + Tailwind + Netlify)

Web de la **Asociación de Comerciantes de Narón**, optimizada para SEO local, móvil,
velocidad y captación de socios.

## Stack
- **Astro 4** — HTML estático, 0 JS por defecto → carga <1 s.
- **Tailwind CSS 4** (vía `@tailwindcss/vite`).
- **Netlify** — despliegue continuo + CDN global.
- **n8n** — automatización de formularios (pendiente de conectar).

## Páginas
`/` · `/directorio` · `/ventajas` · `/campanas` · `/noticias` · `/contacto` · `/hazte-socio` · página `404` personalizada.

---

## 1. Desarrollo en local
```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # genera /dist (lo que publica Netlify)
npm run preview   # sirve /dist para revisar el build
```

---

## 2. Subir a GitHub (comandos exactos)
Desde la carpeta del proyecto (`comercio-naron-web`):

```bash
# 1. Inicializa el repositorio
git init
git branch -M main

# 2. Añade y confirma los archivos
git add .
git commit -m "Web Comercio de Narón: Astro + Tailwind"

# 3. Crea el repo en GitHub y conéctalo
#    (con GitHub CLI, crea y sube en un paso)
gh repo create comercio-naron-web --public --source=. --remote=origin --push

#    --- o, si creas el repo manualmente en github.com ---
git remote add origin https://github.com/TU-USUARIO/comercio-naron-web.git
git push -u origin main
```
> `.gitignore` ya excluye `node_modules/`, `dist/`, `.astro/` y `.env`.

---

## 3. Desplegar en Netlify
1. Entra en [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**.
2. Conecta tu cuenta de **GitHub** y elige el repo `comercio-naron-web`.
3. Netlify detecta la configuración desde `netlify.toml`. Confirma:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 20 (definida en `netlify.toml`).
4. Pulsa **Deploy**. En ~1 min tendrás una URL `*.netlify.app`.
5. **Dominio propio:** *Domain settings → Add a domain* → apunta `comerciodenaron.com`
   a Netlify (DNS) y se activa HTTPS automático.

Cada `git push` a `main` vuelve a desplegar automáticamente.

---

## 4. Formularios (preparados, SIN conectar todavía)
Los formularios de **alta de socio**, **contacto** y **newsletter** están listos pero
**no envían datos a ningún servidor**. Funcionan en *modo demo*: validan, hacen reset
y muestran un mensaje de confirmación.

Leen la URL del webhook desde la variable de entorno **`PUBLIC_N8N_WEBHOOK`**:
- Si está **vacía** (estado actual) → modo demo, no se envía nada.
- Si tiene una **URL** → los formularios hacen `POST` con los datos en JSON.

Cuando quieras activarlos (más adelante, con n8n):
1. En **Netlify → Site settings → Environment variables**, crea
   `PUBLIC_N8N_WEBHOOK` con la URL del webhook.
2. Vuelve a desplegar. Nada más que tocar en el código.

> Cada formulario manda un campo `origen` (`web-hazte-socio`, `web-contacto`) para
> distinguirlos en el flujo, e incluye un *honeypot* anti-spam.

Para desarrollo local: copia `.env.example` a `.env` y rellena la variable si la necesitas.

---

## Directorio: datos reales de comercios
El directorio (`/directorio`) **NO usa datos ficticios**: se generan a partir de la web
oficial `comerciodenaron.com` con un script importador.

```bash
npm run import:comercios     # = node scripts/import-comercios.mjs
```

Qué hace el script ([scripts/import-comercios.mjs](scripts/import-comercios.mjs)):
1. Pagina `/listado-de-comercios/page/N/` y reúne **todos** los comercios (81 actualmente).
2. Recorre los archivos de **sector** y **zona** para asignar categoría y ubicación a cada uno.
3. Abre cada ficha `/Comercio/<slug>/` y extrae **nombre, dirección, teléfono, email, web e imagen**.
4. Escribe **`src/data/comercios.json`** (ordenado por nombre).

`src/data/comercios.ts` tipa esos datos y deriva las listas de categorías y zonas.
La página lee de ahí, así que el **contador refleja el número real** de comercios cargados.

### Imágenes de los comercios (locales)
Las fotos reales se descargan al repo para no depender del servidor de WordPress:

```bash
npm run import:imagenes      # = node scripts/download-imagenes.mjs
```

[scripts/download-imagenes.mjs](scripts/download-imagenes.mjs) descarga cada imagen a
`public/img/comercios/<slug>.<ext>` y reescribe `comercios.json` con la ruta local. Detalles:
- **22** comercios tienen foto propia; se guardan con el **slug** como nombre y su extensión real (`.jpg`/`.png`/`.webp`).
- Ignora el placeholder oficial del sitio (`unnamed.jpg` = “IMAGEN NO DISPONIBLE”), que 7 comercios reutilizan:
  esos quedan **sin imagen** y muestran el placeholder de marca de la web.
- **No descarga duplicados** (cachea por URL de origen).
- Ejecútalo **después** de `import:comercios` (que regenera las URLs remotas).

### Optimización a WebP (producción)
```bash
npm run optimize:imagenes    # = node scripts/optimizar-imagenes.mjs
```

[scripts/optimizar-imagenes.mjs](scripts/optimizar-imagenes.mjs) convierte las imágenes del
directorio a **WebP** con `sharp` (calidad 80, anchura máx. 1000px) y actualiza `comercios.json`.
- Si una conversión falla o **no reduce** el peso, conserva el original y su ruta (fallback).
- Resultado real: **4,28 MB → 0,66 MB (-84,6%)**, 20 a WebP y 2 en fallback (.jpg).
- Flujo completo de datos: `import:comercios` → `import:imagenes` → `optimize:imagenes`.

### Optimización de las imágenes de portada
```bash
npm run optimize:home        # = node scripts/optimizar-home.mjs
```
[scripts/optimizar-home.mjs](scripts/optimizar-home.mjs) convierte a WebP las imágenes de
`public/img/` (hero, secciones, campañas, testimonios) y **reescribe automáticamente** las rutas
en `src/`. Resultado real: **2,23 MB → 1,28 MB (-42,6%)**, 13/13 convertidas.
- El **hero** de la portada se sirve con `fetchpriority="high"` + `loading="eager"` (es el LCP).
- El resto de imágenes usan `loading="lazy"`. Mismo flujo de fallback que el script anterior.

### Dimensiones de imagen (anti-CLS)
```bash
npm run dims:imagenes        # = node scripts/dimensiones-imagenes.mjs
```
[scripts/dimensiones-imagenes.mjs](scripts/dimensiones-imagenes.mjs) mide el ancho×alto real de
cada imagen y genera `src/data/img-dims.json`. Todas las páginas importan ese mapa y ponen
`width`/`height` en cada `<img>` (`width={dims[src]?.w} height={dims[src]?.h}`), lo que reserva el
espacio y **elimina el CLS** sin afectar al diseño responsive (las imágenes siguen con
`object-cover` y clases `w-full`/`h-full`). Reejecuta este script si añades o cambias imágenes.

Notas:
- Si un comercio no publica un dato (teléfono, email, web, imagen…), el campo queda
  vacío y la ficha muestra “No disponible” o simplemente oculta ese botón. **No se inventa nada.**
- Requiere **Node 18+** (usa `fetch` global, sin dependencias).
- Para refrescar el directorio cuando la asociación actualice su web, vuelve a ejecutar el comando
  y haz commit del `comercios.json` resultante.

## ⚠️ Contenido a sustituir antes de publicar
Esta es una **propuesta visual (demo)**. Antes de hacerla pública, reemplazar:
- **Fotografías** (`public/img/`): ahora son fotos de stock que dan el tono correcto.
  Sustituir por **fotos reales de Narón**, sus comercios y escaparates.
- **Noticias** y **fechas de campañas**: son datos de muestra (el **directorio ya es real**, ver sección anterior).
- **Testimonios** y **carta de la Junta**: nombres y citas de ejemplo → poner los reales con autorización.
- **Logo/emblema** (`src/components/Logo.astro`): provisional; sustituir por el oficial si existe.

---

## SEO — checklist
- [x] `<title>`, `description`, canonical y Open Graph por página.
- [x] Schema.org `LocalBusiness`.
- [x] `sitemap.xml` automático (`@astrojs/sitemap`).
- [x] Página 404 personalizada.
- [ ] Vincular Google Business Profile + NAP coherente.
- [ ] Artículos de blog "… en Narón" (long-tail local).

## Estructura
```
src/
├── layouts/Layout.astro        # <head> SEO + schema.org + WhatsApp
├── components/                 # Header, Footer, CTA, PageHero, Icon, Logo, WhatsAppButton
└── pages/                      # index, directorio, ventajas, campanas, noticias, contacto, hazte-socio, 404
public/img/                     # fotografías (sustituir por reales de Narón)
netlify.toml                    # build + cabeceras
.env.example                    # plantilla de variables de entorno
```
