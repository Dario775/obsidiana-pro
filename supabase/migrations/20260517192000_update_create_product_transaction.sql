-- Migration: Update atomic product creation function
-- Description: Adds optional barcode and default fields (options, requires_shipping) to the transaction.
-- Backwards compatible with p_barcode defaulting to NULL.

CREATE OR REPLACE FUNCTION public.create_product_with_dependencies(
  p_tenant_id UUID,
  p_nombre VARCHAR,
  p_slug VARCHAR,
  p_description TEXT,
  p_images TEXT[],
  p_available_online BOOLEAN,
  p_sku VARCHAR,
  p_price_ars INT,
  p_stock INT,
  p_barcode VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_product_id UUID;
  v_variant_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Insertar producto
  INSERT INTO public.products (
    tenant_id,
    nombre,
    slug,
    description,
    status,
    images,
    available_online
  ) VALUES (
    p_tenant_id,
    p_nombre,
    p_slug,
    p_description,
    'active',
    p_images,
    p_available_online
  )
  RETURNING id INTO v_product_id;

  -- 2. Insertar variante
  INSERT INTO public.product_variants (
    tenant_id,
    product_id,
    sku,
    price_ars,
    barcode,
    requires_shipping,
    options
  ) VALUES (
    p_tenant_id,
    v_product_id,
    p_sku,
    p_price_ars,
    p_barcode,
    true,
    '{}'::jsonb
  )
  RETURNING id INTO v_variant_id;

  -- 3. Insertar nivel de inventario
  INSERT INTO public.inventory_levels (
    tenant_id,
    variant_id,
    on_hand,
    committed
  ) VALUES (
    p_tenant_id,
    v_variant_id,
    p_stock,
    0
  );

  v_result := jsonb_build_object(
    'product_id', v_product_id,
    'variant_id', v_variant_id
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
