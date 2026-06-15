-- ─────────────────────────────────────────────────────────────────────────────
-- Campañas: slug (para la ficha pública) + resumen (encabezado)
-- ─────────────────────────────────────────────────────────────────────────────
-- Idempotente y no destructivo. Pégalo en el SQL editor de Supabase.
-- `descripcion`, `fecha_inicio`, `fecha_fin`, `imagen`, `activa` ya existen.
-- Aquí se añaden: slug, resumen.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.campanas add column if not exists slug    text;
alter table public.campanas add column if not exists resumen text;

-- Backfill de slug para filas sin slug, evitando duplicados (sufijo -2, -3…).
with d as (
  select
    id,
    trim(both '-' from regexp_replace(lower(titulo), '[^a-z0-9]+', '-', 'g')) as base,
    row_number() over (
      partition by trim(both '-' from regexp_replace(lower(titulo), '[^a-z0-9]+', '-', 'g'))
      order by created_at
    ) as rn
  from public.campanas
  where (slug is null or slug = '') and titulo is not null
)
update public.campanas c
set slug = case when d.rn = 1 then d.base else d.base || '-' || d.rn end
from d
where c.id = d.id and nullif(d.base, '') is not null;

-- Unicidad del slug (índice parcial: ignora nulos).
create unique index if not exists campanas_slug_key
  on public.campanas (slug) where slug is not null;

-- Verificación
select id, titulo, slug, activa from public.campanas order by created_at desc;
