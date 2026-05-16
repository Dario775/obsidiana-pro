-- Comprehensive migration to fix missing columns in the 'products' table
-- This ensures the cloud database matches the expected schema in the code.

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

-- Optional: Populate slug for existing products if they are missing it
UPDATE public.products 
SET slug = lower(regexp_replace(nombre, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Optional: Sync title from nombre if title is missing
UPDATE public.products 
SET title = nombre
WHERE title IS NULL OR title = '';

COMMENT ON COLUMN public.products.seo IS 'Metadata SEO y enlaces externos (ej: ml_url)';
COMMENT ON COLUMN public.products.online_reserved IS 'Stock reservado para ventas online (no disponible en POS)';
COMMENT ON COLUMN public.products.slug IS 'URL friendly identifier for the product';
