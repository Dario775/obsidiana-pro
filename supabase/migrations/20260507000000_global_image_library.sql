-- Global Image Library Architecture
-- Enables shared image catalog across tenants with crowdsourcing workflow

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Global Catalog: Master table for high-quality product images
CREATE TABLE IF NOT EXISTS global_catalog (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode_ean13 text UNIQUE,
  normalized_name text NOT NULL,
  normalized_slug text UNIQUE,
  category text,
  brand text,
  cloudinary_public_id text NOT NULL,
  cloudinary_url text NOT NULL,
  cloudinary_version text,
  width integer,
  height integer,
  format text,
  bytes integer,
  quality_score numeric DEFAULT 0,
  usage_count int DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'featured')),
  contributed_by uuid REFERENCES auth.users(id),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS global_catalog_barcode_idx ON global_catalog(barcode_ean13);
CREATE INDEX IF NOT EXISTS global_catalog_name_idx ON global_catalog(normalized_name);
CREATE INDEX IF NOT EXISTS global_catalog_slug_idx ON global_catalog(normalized_slug);
CREATE INDEX IF NOT EXISTS global_catalog_status_idx ON global_catalog(status);
CREATE INDEX IF NOT EXISTS global_catalog_brand_idx ON global_catalog(brand);
CREATE INDEX IF NOT EXISTS global_catalog_name_trgm_idx ON global_catalog USING gin(normalized_name gin_trgm_ops);

-- 2. Product Global References: Links tenant products to global images
CREATE TABLE IF NOT EXISTS product_global_refs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  global_catalog_id uuid REFERENCES global_catalog(id) ON DELETE SET NULL,
  ref_type text NOT NULL DEFAULT 'direct' CHECK (ref_type IN ('direct', 'contribution')),
  matched_by text,
  match_confidence numeric,
  tenant_image_override text,
  contribution_status text DEFAULT 'none' CHECK (contribution_status IN ('none', 'pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, global_catalog_id)
);

CREATE INDEX IF NOT EXISTS product_global_refs_tenant_idx ON product_global_refs(tenant_id);
CREATE INDEX IF NOT EXISTS product_global_refs_global_idx ON product_global_refs(global_catalog_id);

-- 3. Add global reference columns to product_variants
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS global_catalog_id uuid REFERENCES global_catalog(id) ON DELETE SET NULL;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS use_global_image boolean DEFAULT false;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS tenant_image_override text;

CREATE INDEX IF NOT EXISTS product_variants_global_idx ON product_variants(global_catalog_id);

-- 4. Enable RLS
ALTER TABLE global_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_global_refs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for global_catalog
DROP POLICY IF EXISTS "global_catalog_public_read" ON global_catalog;
DROP POLICY IF EXISTS "global_catalog_contribute" ON global_catalog;
DROP POLICY IF EXISTS "global_catalog_admin_manage" ON global_catalog;

CREATE POLICY "global_catalog_public_read" ON global_catalog
  FOR SELECT USING (status IN ('approved', 'featured'));

CREATE POLICY "global_catalog_contribute" ON global_catalog
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "global_catalog_admin_manage" ON global_catalog
  FOR ALL USING (public.is_platform_admin());

-- RLS Policies for product_global_refs
DROP POLICY IF EXISTS "product_global_refs_tenant_access" ON product_global_refs;

CREATE POLICY "product_global_refs_tenant_access" ON product_global_refs
  FOR ALL USING (public.is_platform_admin() OR tenant_id = public.current_tenant_id())
  WITH CHECK (public.is_platform_admin() OR tenant_id = public.current_tenant_id());

-- 5. Helper function: Get effective image
CREATE OR REPLACE FUNCTION get_product_image(
  p_tenant_id uuid,
  p_global_catalog_id uuid,
  p_tenant_override text
) RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_tenant_override IS NOT NULL AND p_tenant_override <> '' THEN
    RETURN p_tenant_override;
  END IF;
  
  IF p_global_catalog_id IS NOT NULL THEN
    RETURN (SELECT cloudinary_url FROM global_catalog WHERE id = p_global_catalog_id);
  END IF;
  
  RETURN NULL;
END;
$$;

-- 6. Function: Normalize text
CREATE OR REPLACE FUNCTION normalize_text(input_text text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        COALESCE(input_text, ''),
        '[^\w\s]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END;
$$;

-- 7. Function: Find global image
CREATE OR REPLACE FUNCTION find_global_image(
  p_barcode text DEFAULT NULL,
  p_product_name text DEFAULT NULL
) RETURNS TABLE (
  id uuid,
  cloudinary_url text,
  normalized_name text,
  quality_score numeric,
  match_type text
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_barcode IS NOT NULL AND length(p_barcode) >= 12 THEN
    RETURN QUERY
    SELECT gc.id, gc.cloudinary_url, gc.normalized_name, gc.quality_score, 'barcode'::text
    FROM global_catalog gc
    WHERE gc.barcode_ean13 = p_barcode
      AND gc.status IN ('approved', 'featured')
    ORDER BY gc.quality_score DESC NULLS LAST
    LIMIT 1;
    
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  IF p_product_name IS NOT NULL THEN
    RETURN QUERY
    SELECT gc.id, gc.cloudinary_url, gc.normalized_name, gc.quality_score, 'name_similarity'::text
    FROM global_catalog gc
    WHERE gc.status IN ('approved', 'featured')
      AND gc.normalized_name ILIKE '%' || p_product_name || '%'
    ORDER BY gc.quality_score DESC NULLS LAST
    LIMIT 1;
  END IF;
END;
$$;

-- 8. Admin function: Approve global image
CREATE OR REPLACE FUNCTION admin_approve_global_image(
  p_global_catalog_id uuid,
  p_new_name text DEFAULT NULL,
  p_new_barcode text DEFAULT NULL,
  p_status text DEFAULT 'approved'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'admin_only';
  END IF;
  
  UPDATE global_catalog
  SET 
    normalized_name = COALESCE(p_new_name, normalized_name),
    barcode_ean13 = COALESCE(p_new_barcode, barcode_ean13),
    normalized_slug = COALESCE(
      normalize_text(p_new_name),
      normalized_slug
    ),
    status = p_status,
    approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE approved_at END,
    updated_at = now(),
    admin_notes = CASE 
      WHEN p_new_name IS NOT NULL THEN 'Renamed to: ' || p_new_name 
      ELSE admin_notes 
    END
  WHERE id = p_global_catalog_id;
END;
$$;

-- 9. Add new columns to products if missing
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_online boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS online_reserved integer DEFAULT 0;

-- 10. Add new columns to product_variants if missing
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS available_online boolean DEFAULT false;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS online_reserved integer DEFAULT 0;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS online_price numeric DEFAULT 0;

-- Grant permissions
GRANT SELECT ON global_catalog TO authenticated;
GRANT INSERT ON global_catalog TO authenticated;
GRANT UPDATE ON global_catalog TO platform_admin;
GRANT SELECT ON product_global_refs TO authenticated;

SELECT 'Migration completed successfully' AS result;