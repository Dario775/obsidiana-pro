-- 🚨 REPARACIÓN CRÍTICA: Columnas faltantes en tabla 'products'
-- Ejecutar este SQL en el Editor SQL de Supabase para sincronizar la base de datos con el código.

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS seo jsonb DEFAULT '{}'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS precio numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS costo numeric DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS descripcion text,
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ARS'::text NOT NULL,
ADD COLUMN IF NOT EXISTS online_reserved integer DEFAULT 0;

-- 🛠️ GENERACIÓN DE DATOS FALTANTES
-- Generar slugs para productos que no lo tengan
UPDATE public.products 
SET slug = lower(regexp_replace(nombre, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || floor(random() * 1000)::text
WHERE slug IS NULL OR slug = '';

-- Sincronizar title desde nombre
UPDATE public.products 
SET title = nombre
WHERE title IS NULL OR title = '';

-- Sincronizar descripcion desde description
UPDATE public.products 
SET descripcion = description
WHERE descripcion IS NULL OR descripcion = '';

-- 🏷️ COMENTARIOS
COMMENT ON COLUMN public.products.seo IS 'Metadata SEO y enlaces externos (ej: ml_url)';
COMMENT ON COLUMN public.products.online_reserved IS 'Stock reservado para ventas online (no disponible en POS)';
COMMENT ON COLUMN public.products.slug IS 'Identificador único para la URL de la tienda online';
