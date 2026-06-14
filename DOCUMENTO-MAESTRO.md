# 📘 DOCUMENTO MAESTRO — Web Comercio de Narón

> Documento de contexto completo para retomar el proyecto en un chat nuevo tras `/clear`.
> Última consolidación basada en el estado real del repositorio.

---

## 1. Objetivo del proyecto
Rehacer desde cero la web de la **Asociación de Comerciantes de Narón** como una **propuesta moderna** que:
- Capte **socios** (comerciantes) → objetivo de negocio nº1 (cuota 6 €/mes).
- Sea un **directorio útil** del comercio local para los vecinos.
- Sea rápida, accesible, optimizada para **SEO local** y preparada para **automatizaciones (n8n)** y **CRM** futuros.
Entregable actual: **demo/propuesta** lista para enseñar a la presidenta, no aún web pública definitiva.

## 2. Cliente / propuesta
- **Entidad:** Asociación de Comerciantes de Narón (Narón, A Coruña, Galicia, España).
- **Interlocutora:** "Choly" (presidenta / contacto).
- **Naturaleza:** asociación sin ánimo de lucro de comercio local; ~81 comercios con ficha pública.
- **Datos de contacto reales conocidos:** teléfono **622 086 621**, email actual `acnaron@hotmail.es` (se propone migrar a `info@comerciodenaron.com`), Facebook `comerciodenaron`.

## 3. Web original analizada
- URL: `https://comerciodenaron.com` (WordPress antiguo).
- Problemas: lenta, no responsive, SEO local casi inexistente, email @hotmail, directorio pobre, sin WhatsApp, jerarquía confusa, sin captación clara de socios.
- Valoración estimada original: **~4/10**.
- El directorio real vive en `https://comerciodenaron.com/listado-de-comercios/` (CPT WordPress "Comercio", fichas en `/Comercio/<slug>/`, taxonomías `categoría-de-comercios/` y `ubicación/`). **Sin REST API para el CPT** → se hizo scraping del HTML.

## 4. URL pública de Netlify
**TODAVÍA NO DESPLEGADA.** No existe URL pública aún. El proyecto compila y está listo para desplegar, pero no se ha subido a GitHub ni conectado a Netlify (ver punto 16). El dominio de producción previsto es `comerciodenaron.com` (placeholder `[DOMINIO DEFINITIVO]` en datos legales).

## 5. Tecnologías usadas
- **Astro 4.16** (sitio estático, 0 JS por defecto).
- **Tailwind CSS 4** vía `@tailwindcss/vite` (no plugin de Astro; config en `astro.config.mjs`).
- **@astrojs/sitemap 3.2.1** (¡pinned! la 3.7 rompe con Astro 4).
- **sharp** (transitivo de Astro) para conversión WebP y medición de dimensiones.
- **Netlify** para hosting (config en `netlify.toml`, Node 20).
- Fuentes: **Fraunces** (display/serif) + **Inter** (texto), vía Google Fonts.
- Sin frameworks JS de cliente; interactividad con `<script>` vanilla.

## 6. Estructura completa del proyecto
```
comercio-naron-web/
├── astro.config.mjs          # site=comerciodenaron.com, sitemap, tailwind vite
├── netlify.toml              # build npm run build → dist, Node 20, headers
├── package.json              # scripts (ver punto 15)
├── tsconfig.json / src/env.d.ts
├── .env.example              # PUBLIC_N8N_WEBHOOK (vacío)
├── .gitignore                # node_modules, dist, .astro, .env
├── README.md                 # documentación operativa
├── DOCUMENTO-MAESTRO.md       # este archivo
├── .claude/launch.json       # config preview (npm --prefix comercio-naron-web run dev, port 4321)
├── public/
│   ├── favicon.svg           # emblema (toldo + ría)
│   ├── robots.txt            # Allow + Sitemap
│   └── img/
│       ├── *.webp            # 13 imágenes home/secciones (hero, cafe, fruteria, etc.)
│       └── comercios/        # 22 imágenes reales de comercios (.webp + 2 .jpg fallback)
└── src/
    ├── styles/global.css     # tema (verde #0b5d4a, dorado #c8902f, crema), prose-legal, bg-grid
    ├── layouts/Layout.astro  # <head> SEO, OG, schema LocalBusiness + schemaExtra, Header/Footer/WhatsApp
    ├── data/
    │   ├── comercios.json     # 81 comercios reales (datos brutos)
    │   ├── comercios.ts       # tipado + normalización + totalComercios + categorias/zonas + getComercio
    │   ├── asociacion.ts      # ENTIDAD con placeholders legales
    │   └── img-dims.json      # mapa /ruta → {w,h} para width/height
    ├── components/           # ver punto 14
    └── pages/                # ver punto 7
```

## 7. Páginas creadas (95 páginas en build)
**Principales (8):** `/` (index), `/directorio`, `/ventajas`, `/campanas`, `/noticias`, `/contacto`, `/hazte-socio`, `/transparencia`.
**Fichas dinámicas:** `/comercio/[slug]` → **81 fichas** (getStaticPaths desde comercios.ts).
**Legales (6):** `/aviso-legal`, `/politica-privacidad`, `/politica-cookies`, `/terminos-condiciones`, `/proteccion-datos`, `/transparencia` (institucional).
**Otras:** `/404` personalizada.
Total verificado: **95 páginas**, build limpio, **0 enlaces internos rotos** (96 únicos).

## 8. Directorio de comercios
- **Cómo se importaron:** scraping del WordPress con `scripts/import-comercios.mjs` (Node 18+, fetch global, sin dependencias). Pagina `/listado-de-comercios/page/N/`, cruza archivos de sector (`categoría-de-comercios/`) y zona (`ubicación/`), y abre cada ficha `/Comercio/<slug>/` para extraer datos. **No inventa datos.**
- **Número de comercios:** **81**.
- **Campos por comercio:** `slug, nombre, categoria, zona, direccion, telefono, email, web, imagen`.
- **Cobertura real:** categoría 78/81 · dirección 79 · teléfono 68 · email 67 · zona 42 · web 43 · imagen 22.
- **Normalización (en `comercios.ts`, sobrevive a reimport):** `Optica`→`Óptica`; categorías deducidas por slug: `drogueria-dyppo`→Droguería, `mon-voyage`→Hoteles/Viajes. 1 sin categoría (`centro-impronta`).
- **Calidad validada:** 2 URLs malformadas (espacios `%20`) corregidas; 7 webs muertas (404/sin respuesta) eliminadas; el importador ahora limpia espacios para no reintroducirlas.
- **Cifra única en toda la web:** `totalComercios` (=81) en `comercios.ts`. NO quedan referencias a "+90"/"más de 90".
- **UI del directorio:** buscador por nombre + filtro categoría + filtro zona (JS vanilla, filtrado en cliente), contador real, estados vacíos elegantes (icono si no hay imagen; botón solo si hay dato), botón "Ver ficha" siempre presente. Tarjetas enlazan a `/comercio/[slug]`.
- **Fichas individuales:** nombre, categoría, zona, dirección, teléfono, email, web, imagen, CTA (WhatsApp/llamar/web/email), mapa Google "Cómo llegar", comercios relacionados, migas de pan, Schema.org `Store`.

## 9. Imágenes
- **Descarga (`scripts/download-imagenes.mjs`):** descargó 22 imágenes reales de comercios a `public/img/comercios/<slug>.<ext>`. Ignoró el placeholder oficial `unnamed.jpg` ("IMAGEN NO DISPONIBLE") reutilizado por 7 comercios. Sin duplicados (caché por URL). Reescribió rutas en `comercios.json`.
- **Optimización WebP:**
  - `scripts/optimizar-imagenes.mjs` (directorio): **4,28 MB → 0,66 MB (-84,6%)**, 20 a WebP + 2 fallback .jpg (no mejoraban).
  - `scripts/optimizar-home.mjs` (portada/secciones): **2,23 MB → 1,28 MB (-42,6%)**, 13/13 a WebP, y reescribe rutas `.jpg`→`.webp` en `src/`.
  - Calidad 80, anchura máx. (hero/escaparate/evento 1600px; retratos 600; resto 1200). Fallback si no reduce peso.
- **Peso total imágenes en dist:** ~1,94 MB.
- **Dimensiones (`scripts/dimensiones-imagenes.mjs`):** mide ancho×alto real → `src/data/img-dims.json`, consumido por los `<img>` para width/height.
- ⚠️ Las imágenes de portada/secciones son **stock** (dan el tono, no son de Narón). Las 22 de comercios SÍ son reales.

## 10. SEO
- **Titles:** únicos por página (28-43 car.), patrón `… | Comercio de Narón`.
- **Meta descriptions:** únicas (100-143 car.), por página.
- **Canonical:** en todas (`Astro.url` + `site`).
- **Open Graph + Twitter Card:** en todas; fichas usan la imagen del comercio como `og:image`.
- **Sitemap:** `@astrojs/sitemap` → `dist/sitemap-index.xml` (incluye las 81 fichas).
- **robots.txt:** `public/robots.txt` (`User-agent: * / Allow: / / Sitemap: …`).
- **Schema.org:** `LocalBusiness` global (Layout) + `Store` por ficha (prop `schemaExtra` del Layout).
- **lang="es"**, URLs limpias.

## 11. Core Web Vitals
- **LCP:** hero de la home con `fetchpriority="high"` + `loading="eager"` + WebP (128 KB).
- **CLS:** TODAS las `<img>` con `width`/`height` reales (desde `img-dims.json`) → reserva de espacio. object-cover + contenedores de altura fija.
- **Lazy loading:** todas las imágenes salvo los heroes (above-the-fold) usan `loading="lazy"` + `decoding="async"`.
- **JS:** ~2,4 KB total en dist (Astro estático).

## 12. Formularios
- **Tres formularios:** contacto (`/contacto`), alta de socio (`/hazte-socio`), newsletter (en `Footer.astro`).
- **Modo demo:** NINGUNO envía datos a un servidor todavía. Leen `import.meta.env.PUBLIC_N8N_WEBHOOK`; si está vacío (estado actual) → muestran confirmación, resetean y **no hacen petición de red**. Honeypot anti-spam (`name="website"`).
- **Variable `PUBLIC_N8N_WEBHOOK`:** definir en Netlify (Environment variables) para activar el envío (POST JSON con campo `origen`). Plantilla en `.env.example`. Sin cambios de código necesarios.
- **RGPD:** casilla obligatoria en los 3 formularios, con enlaces a `/politica-privacidad` y `/proteccion-datos`. Doble validación: `required` nativo + guard JS (no envía sin marcar). Verificado en navegador.

## 13. Base legal (BASE INICIAL — requiere revisión jurídica)
Páginas: `/aviso-legal`, `/politica-privacidad`, `/politica-cookies`, `/terminos-condiciones`, `/proteccion-datos`, `/transparencia`. Adaptadas a España/UE, **RGPD** y **LSSI-CE**, y al caso de asociación + formularios + n8n + analítica futura. Enlazadas desde el footer. `/noticias` y `/campanas` llevan banner **"Contenido de ejemplo"**.
- **Placeholders pendientes** (en `src/data/asociacion.ts`, resaltados en verde en la web):
  `[NOMBRE LEGAL DE LA ASOCIACIÓN]`, `[CIF/NIF]`, `[DOMICILIO SOCIAL]`, `[Nº REGISTRO DE ASOCIACIONES]`, `[EMAIL DE CONTACTO LEGAL]`, `[DOMINIO DEFINITIVO]`, `[FECHA DE ÚLTIMA ACTUALIZACIÓN]`, nombres de la **junta directiva** en `/transparencia`.
- ⚠️ Textos = base orientativa, **no asesoramiento legal**. Revisar con asesor antes de publicar.

## 14. Componentes importantes (`src/components/`)
- `Layout.astro` — `<head>`, SEO/OG, schema (LocalBusiness + `schemaExtra`), defaults con `totalComercios`.
- `Header.astro` — barra institucional (tel/email/cifra), nav, menú móvil, CTA Hazte socio.
- `Footer.astro` — newsletter (con RGPD), columnas, **enlaces legales**, copyright.
- `PageHero.astro` — cabecera reutilizable (variante con imagen o crema), usa `img-dims`.
- `CTA.astro` — bloque de llamada a la acción (verde).
- `Icon.astro` — set de iconos SVG inline (estilo Lucide), sin emojis.
- `Logo.astro` — emblema SVG (toldo + ría) + wordmark.
- `WhatsAppButton.astro` — botón flotante (wa.me/34622086621).
- `DemoNotice.astro` — banner "Contenido de ejemplo" (noticias/campañas).

## 15. Scripts npm disponibles
```
npm run dev               # servidor de desarrollo (localhost:4321)
npm run build             # build a /dist (lo que publica Netlify)
npm run preview           # sirve /dist
npm run import:comercios  # scraping → src/data/comercios.json
npm run import:imagenes   # descarga imágenes reales → public/img/comercios/
npm run optimize:imagenes # WebP del directorio
npm run optimize:home     # WebP de portada/secciones + reescribe rutas
npm run dims:imagenes     # genera src/data/img-dims.json
```
Flujo de datos completo: `import:comercios` → `import:imagenes` → `optimize:imagenes` → (`optimize:home` si se cambian imágenes de portada) → `dims:imagenes`.

## 16. Estado de GitHub y Netlify
- **Git:** el directorio de trabajo **NO es un repo git todavía** (no inicializado, sin commits).
- **GitHub:** sin repositorio creado.
- **Netlify:** sin desplegar; no hay URL pública.
- **Listo para desplegar:** sí. Comandos en README. Resumen:
  ```
  git init && git branch -M main && git add . && git commit -m "Web Comercio de Narón"
  gh repo create comercio-naron-web --public --source=. --remote=origin --push
  # Netlify: Import from Git → build "npm run build", publish "dist" (ya en netlify.toml)
  ```

## 17. Pendientes antes de publicar en producción
1. Rellenar **datos legales reales** (placeholders en `asociacion.ts`) + **revisión jurídica**.
2. **Banner/gestor de cookies** (los mapas de Google cargan cookies de terceros) y actualizar `/politica-cookies`.
3. **Conectar n8n** (definir `PUBLIC_N8N_WEBHOOK` en Netlify) para que los formularios envíen de verdad; idealmente flujo alta→email bienvenida→aviso WhatsApp.
4. Sustituir **contenido de ejemplo**: noticias, testimonios y fechas de campañas por reales.
5. **Fotos reales de Narón** (hero, secciones) y de los comercios que falten.
6. Crear buzón **info@comerciodenaron.com**.
7. Nombres reales de la **junta directiva** en `/transparencia`.
8. (Opcional) Analítica (Plausible), imagen OG dedicada, deep-linking de filtros del directorio.

## 18. Qué está listo para enseñar a Choly
- **Inicio** (hero institucional, cifra real "81 comercios", WhatsApp flotante).
- **Directorio** real con 81 comercios, búsqueda y filtros funcionando, y **fichas individuales** con foto/mapa/contacto.
- **Hazte socio** y **Contacto** (formularios en modo demo con RGPD).
- **Ventajas** y **Transparencia** (institucional, cuota 6€).
- **Base legal** completa en el footer (como muestra de seriedad).
- Rendimiento y accesibilidad cuidados (WebP, lazy, width/height, alt, aria-labels).

## 19. Qué NO presentar como definitivo
- **Noticias y campañas** (marcadas "Contenido de ejemplo").
- **Testimonios** (citas ilustrativas, ya anonimizadas a sector+zona).
- **Páginas legales** (base inicial, faltan datos + revisión).
- **Formularios** (no envían aún; aclarar "modo demo").
- **Fotos de portada** (stock, no de Narón).
- **Junta directiva** (placeholders).

## 20. Próximos pasos recomendados (orden sugerido)
1. Aplicar los 2 ajustes ya hechos (✅ banner ejemplo + robots.txt).
2. Reunión con Choly → recoger: datos legales, fotos reales, testimonios, noticias, nombres de junta.
3. Subir a GitHub + desplegar en Netlify como **staging** para enseñarlo online.
4. Conectar n8n + CRM y activar formularios.
5. Banner de cookies + revisión legal → pasar a **producción** en `comerciodenaron.com`.

## 21. Valoración final
- **Global: 8,7 / 10** (lo que falta para el 10 es contenido real de la asociación, no desarrollo).
- **Vs. web original (~4/10): +4,7 puntos.**
- **Estado:** demo/propuesta excelente, presentable hoy; no es aún web pública definitiva.

## 22. Cómo continuar en otro chat (tras `/clear`)
1. Proyecto en: `/Users/marcotas/Claude choly/comercio-naron-web` (macOS).
2. Pega este documento al inicio del chat nuevo como contexto.
3. Para retomar: `cd` al proyecto, `npm install` (si hace falta), `npm run build` para validar.
4. Para previsualizar: usar la herramienta de preview (config en `.claude/launch.json`, puerto 4321) o `npm run dev`.
5. Convención de trabajo seguida: cambios reales en el proyecto + verificación en navegador + `npm run build` verde antes de dar nada por hecho. No inventar datos; usar placeholders claros.
6. Datos clave: 81 comercios (`comercios.ts` = fuente única vía `totalComercios`), cifra coherente en toda la web; imágenes WebP optimizadas; formularios en modo demo (`PUBLIC_N8N_WEBHOOK` vacío).
7. Si se regenera el directorio: respetar el orden de scripts del punto 15 y volver a `dims:imagenes`.
8. Antes de producción: completar el punto 17.
