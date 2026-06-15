-- ─────────────────────────────────────────────────────────────────────────────
-- Storage · Comercio de Narón
-- ─────────────────────────────────────────────────────────────────────────────
-- Un único bucket "media" con lectura pública. Las subidas se hacen desde el
-- servidor usando la clave SERVICE_ROLE (endpoint /api/admin/upload).
-- Estructura de carpetas:
--   media/comercios/{comercio_id}/{logo|galeria}/{timestamp}-{nombre}
--   media/noticias/{noticia_id}/{timestamp}-{nombre}
--   media/campanas/{campana_id}/{timestamp}-{nombre}
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760, -- 10 MB por archivo
  -- SVG y GIF excluidos a propósito: SVG permite XSS almacenado.
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Política: lectura pública (sirve URLs de imagen al sitio público).
drop policy if exists "media: lectura pública" on storage.objects;
create policy "media: lectura pública"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

-- Las escrituras solo las hace el servidor con SERVICE_ROLE (ignora RLS).
-- No definimos políticas INSERT/UPDATE/DELETE para anon/authenticated.
