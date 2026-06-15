# Panel de administración — Comercio de Narón

Plataforma administrable construida sobre la web pública existente. El sitio
público sigue siendo 100% estático (rendimiento intacto); las rutas `/admin/*`
y `/api/*` se sirven en SSR mediante el adaptador de Netlify.

## Arquitectura

- **Astro híbrido** (`output: 'hybrid'`) con `@astrojs/netlify` como adaptador.
- **Supabase** como backend:
  - Auth (email + contraseña, sin signup público).
  - Postgres + RLS para los datos (comercios, noticias, campañas, solicitudes).
  - Storage para imágenes (bucket `media` con lectura pública).
- **Roles**:
  - `super_admin`: todo + gestión de usuarios.
  - `admin_asociacion`: CRUD completo de contenidos y solicitudes.
  - `editor`: gestión de noticias y campañas.
- **Fuente única de comercios**: Supabase. El sitio público lee del JSON
  estático `src/data/comercios.json`, que se regenera desde la DB con
  `npm run sync:comercios`.

```
src/
├── middleware.ts                  # Protege /admin/* y /api/admin/*
├── lib/
│   ├── auth.ts                    # getSessionUser, requireApiRole
│   ├── form.ts                    # Helpers de FormData + flashRedirect
│   ├── slug.ts
│   └── supabase/
│       ├── server.ts              # Cliente con cookies (sesión)
│       ├── admin.ts               # Cliente con service_role (CRUD)
│       └── types.ts
├── layouts/AdminLayout.astro
├── components/admin/              # Sidebar, Topbar, FormField, ImageUpload…
└── pages/
    ├── login.astro
    ├── admin/                     # Dashboard + 4 CRUD + Configuración
    └── api/
        ├── auth/{login,logout}.ts
        └── admin/                 # Endpoints CRUD + upload + users
supabase/
├── schema.sql
├── rls.sql
├── storage.sql
└── seed-admin.sql
scripts/
├── seed-comercios.mjs             # Carga inicial JSON → Supabase
└── sync-comercios.mjs             # Supabase → JSON (para deploy público)
```

## Instalación

### 1. Variables de entorno

Copia `.env.example` a `.env` y rellena:

```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # ⚠️ Secreta. No subir nunca al repo.
PUBLIC_N8N_WEBHOOK=             # (opcional, ya existente)
```

### 2. Crear las tablas y políticas en Supabase

Abre el **SQL editor** del proyecto Supabase y ejecuta, en orden:

1. `supabase/schema.sql` — tablas, enums, triggers de `updated_at`, hook
   `handle_new_user` que crea el `profile` automáticamente.
2. `supabase/rls.sql` — políticas RLS para anon/authenticated.
3. `supabase/storage.sql` — bucket `media` (público, 10 MB, solo imágenes).

### 3. Crear el primer Super Admin

1. **Supabase Dashboard → Authentication → Users → Add user → Create new user.**
   Marca «Auto Confirm User» para que pueda entrar inmediatamente. Anota la
   contraseña.
2. Edita `supabase/seed-admin.sql` cambiando `CAMBIAR@ejemplo.com` por el email
   real y ejecútalo en el SQL editor.
3. Comprueba con la consulta final que el `role` es `super_admin`.

Desde ese usuario podrás crear el resto desde `Configuración → Invitar usuario`.

### 4. Cargar los comercios existentes

Una sola vez, para llevar los 81 comercios actuales del JSON al panel:

```bash
npm install
npm run seed:comercios
```

### 5. Desarrollo local

```bash
npm run dev          # localhost:4321
```

- Web pública: tal cual estaba.
- Panel: `/admin` (te redirige a `/login` si no hay sesión).

### 6. Despliegue en Netlify

`netlify.toml` define el build como `npm run sync:comercios; npm run build` →
`dist`. Es decir, **cada deploy regenera `comercios.json` desde Supabase** antes
de compilar. En el panel de Netlify (Site settings → Environment variables)
añade las mismas claves de Supabase (necesarias para que el `sync` funcione en
el build). El adaptador `@astrojs/netlify` empaqueta las rutas SSR como Netlify
Functions automáticamente.

> Se usa `;` (no `&&`) a propósito: si el `sync` fallara (Supabase caído o env
> sin definir), el deploy continúa con el `comercios.json` ya commiteado en vez
> de romper la web pública.

> **Importante**: añade `SUPABASE_SERVICE_ROLE_KEY` **solo** como variable de
> entorno (no en el código), y considera marcarla como **deploy-only** en
> Netlify para que no se exponga en builds de previsualización accesibles.

### 7. Auto-deploy al guardar (Build Hook)

Para que la web pública se actualice **sin tocar terminal** al editar desde el
panel:

1. En Netlify: **Site settings → Build & deploy → Build hooks → Add build hook.**
   Ponle un nombre (p. ej. `admin-panel`) y rama `main`. Netlify te da una URL
   tipo `https://api.netlify.com/build_hooks/XXXXXXXX`.
2. Añade esa URL como variable de entorno **`NETLIFY_BUILD_HOOK_URL`** (en
   Netlify y, si quieres probar en local, en tu `.env`).
3. Listo. Al **guardar o eliminar** un comercio, noticia o campaña, el servidor
   hace `POST` a ese hook y Netlify lanza un deploy que ejecuta `sync:comercios`
   + `build`. El mensaje de confirmación pasa a ser:
   *"… La web pública se actualizará en unos minutos."*

> **Seguro ante fallos**: el disparo del deploy es *fire-and-forget* con timeout
> (`src/lib/deploy.ts`). Si Netlify no responde o la variable no está definida,
> el guardado en Supabase se completa igualmente y simplemente no se muestra el
> aviso de actualización (podrás desplegar manualmente).

## Flujo de trabajo del directorio público

Con `NETLIFY_BUILD_HOOK_URL` configurada, **no hay flujo manual**: editas en el
panel y la web pública se regenera sola en pocos minutos.

Si prefieres (o no usas el hook) desplegar a mano:

```bash
npm run sync:comercios   # Supabase → src/data/comercios.json
npm run dims:imagenes    # actualiza width/height si hay imágenes nuevas
git commit -am "Actualiza directorio"
git push                  # Netlify dispara un nuevo build
```

> Las páginas públicas `/noticias` y `/campanas` todavía muestran «Contenido de
> ejemplo». Cuando se conecten a Supabase, su contenido ya se gestiona desde el
> panel y el auto-deploy también las actualizará.

## Uso del panel

### Dashboard (`/admin`)

Contadores en tiempo real (comercios, noticias publicadas, campañas activas,
solicitudes pendientes) y atajos a las últimas solicitudes y noticias.

### Comercios (`/admin/comercios`)

- Buscador por nombre, filtros por categoría/zona, marcar destacados.
- CRUD completo con subida de **logo** y **galería** a Supabase Storage.
- El `slug` se autogenera del nombre y se puede editar.

### Noticias (`/admin/noticias`)

- Estados: publicada / borrador.
- Slug autogenerado.
- Imagen destacada en Storage.
- Fecha de publicación programable.

### Campañas (`/admin/campanas`)

- Vista en tarjetas con imagen.
- Activa/inactiva, fechas inicio/fin.

### Solicitudes de socio (`/admin/solicitudes`)

- Listado con filtros por estado y búsqueda (comercio, contacto, email).
- Detalle con cambio de estado (`pendiente`, `aceptado`, `rechazado`), notas
  internas y eliminación.
- El registro `attended_by` queda con el `user_id` del usuario que cambió el
  estado.

### Configuración (`/admin/configuracion`)

- Tu perfil (nombre visible).
- Cambio de contraseña.
- (Super Admin) Gestión de usuarios: crear, cambiar rol, eliminar.

## Resolución de problemas

### `/admin` o `/login` descargan un archivo vacío en Netlify (pero funcionan en local)

Síntoma de que la **función SSR no está sirviendo la ruta**. Las páginas públicas
(estáticas) cargan bien; solo fallan las rutas SSR. Comprueba, en este orden:

1. **Variables de entorno en Netlify** (causa más habitual). Las rutas `/admin`,
   `/login` y `/api/*` resuelven la sesión con Supabase; si faltan
   `SUPABASE_URL`, `SUPABASE_ANON_KEY` o `SUPABASE_SERVICE_ROLE_KEY` en
   **Site settings → Environment variables**, la función falla. Añádelas y
   vuelve a desplegar (*Clear cache and deploy site*). En los logs de la función
   verás `Faltan SUPABASE_URL…` si es esto.
2. **Build command y publish dir**. En el panel de Netlify, *Build & deploy →
   Build settings*, deben coincidir con `netlify.toml`:
   - Build command: `rm -rf dist .netlify; npm run sync:comercios; npm run build`
   - Publish directory: `dist`
   Si hay valores fijados en la UI que sobreescriben el `netlify.toml`,
   bórralos o alinéalos.
3. **Caché de build corrupta**. El `netlify.toml` ya limpia `dist`/`.netlify`
   antes de compilar para evitar desplegar una función SSR vacía. Si vienes de
   un deploy roto, fuerza *Deploys → Trigger deploy → Clear cache and deploy site*.
4. **Adaptador**. `astro.config.mjs` debe tener `output: 'hybrid'` +
   `adapter: netlify()`. El adaptador genera `.netlify/v1/functions/ssr/` con
   routing `path: '/*'`; no hace falta configurar funciones a mano.

## Seguridad

- **Middleware** (`src/middleware.ts`) protege `/admin/*` (redirige a `/login`
  con `?redirect=<ruta>`) y `/api/admin/*` (401 JSON si no hay sesión).
- **Validación de rol** en cada endpoint con `requireApiRole`. La clave
  `SERVICE_ROLE` solo se usa después de validar permisos.
- **RLS** activa en todas las tablas. Anon solo puede:
  - Leer comercios.
  - Leer noticias publicadas y campañas activas.
  - Insertar solicitudes (formulario público).
- **Storage**: bucket público para lectura; las escrituras pasan exclusivamente
  por `/api/admin/upload` (autenticado + rol).
- Cabeceras `no-store` y `noindex` en `/admin/*` y `/api/*` (`netlify.toml`).

## Solicitudes desde el formulario público

El formulario actual (`/hazte-socio`) sigue funcionando en modo demo o vía n8n
(`PUBLIC_N8N_WEBHOOK`). Cuando quieras que cree solicitudes en el panel,
añade un POST a la tabla `solicitudes_socio` con la `ANON_KEY` (la política
RLS lo permite) o expón un endpoint `/api/public/solicitudes-socio`.

## Comandos npm

```
dev               servidor local (4321)
build             build a /dist (Netlify)
preview           sirve /dist
seed:comercios    JSON → Supabase (una vez)
sync:comercios    Supabase → JSON (antes de desplegar tras editar)
import:comercios  scraping del WordPress original (legacy)
import:imagenes   descarga imágenes desde el origen
optimize:imagenes Convierte el directorio a WebP
optimize:home     Convierte portada/secciones a WebP
dims:imagenes     Mide width/height para CLS
```

## Próximos pasos sugeridos

1. Conectar `/noticias` y `/campanas` públicas a Supabase (lectura SSR o
   prerenderizado en build).
2. Pasar el formulario `/hazte-socio` a insertar directamente en
   `solicitudes_socio` (con captcha + honeypot).
3. Logs de auditoría (quién cambió qué) en una tabla `audit_log`.
4. Imágenes optimizadas en pipeline de Storage (Cloudflare/Sharp).
