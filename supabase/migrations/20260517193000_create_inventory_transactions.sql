-- Migration: Create inventory transactions (audit log / Kardex)
-- Description: Automatically logs every stock change via database triggers, maintaining a history of all inventory operations.

-- 0. Garantizar que la función helper current_tenant_id exista
CREATE OR REPLACE FUNCTION public.current_tenant_id() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select coalesce(
    nullif(auth.jwt() ->> 'tenant_id', '')::uuid,
    nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid,
    nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid
  )
$$;

-- 0.1 Asegurar que las tablas orders y order_items tengan las columnas esperadas por el frontend
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ARS';

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS tax_ars numeric DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS title_snapshot text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sku_snapshot text;

-- Asegurar que la tabla payments tenga las columnas necesarias
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount_ars numeric DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ARS';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone DEFAULT now();

-- 1. Crear tabla de transacciones de inventario
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity_changed INT NOT NULL,
  reason VARCHAR(50) NOT NULL DEFAULT 'adjustment', -- 'sale', 'adjustment', 'purchase', 'loss'
  reference_id UUID,
  created_by UUID, -- auth.users ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Seguridad a Nivel de Fila (RLS)
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas RLS para aislamiento de inquilinos (Multi-tenant)
DROP POLICY IF EXISTS select_inventory_transactions ON public.inventory_transactions;
CREATE POLICY select_inventory_transactions ON public.inventory_transactions
  FOR SELECT
  USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS insert_inventory_transactions ON public.inventory_transactions;
CREATE POLICY insert_inventory_transactions ON public.inventory_transactions
  FOR INSERT
  WITH CHECK (tenant_id = public.current_tenant_id());

-- 4. Crear función para el trigger que registra los cambios de stock automáticamente
CREATE OR REPLACE FUNCTION public.log_inventory_change()
RETURNS TRIGGER AS $$
DECLARE
  v_quantity_changed INT;
  v_reason VARCHAR(50);
  v_user_id UUID;
BEGIN
  v_quantity_changed := NEW.on_hand - OLD.on_hand;
  
  -- Si el stock no cambió, no registrar nada
  IF v_quantity_changed = 0 THEN
    RETURN NEW;
  END IF;

  -- Intentar obtener la razón de la variable de sesión
  BEGIN
    v_reason := NULLIF(current_setting('app.current_inventory_reason', true), '');
  EXCEPTION WHEN OTHERS THEN
    v_reason := NULL;
  END;

  -- Si no se definió una razón específica, usar 'adjustment'
  IF v_reason IS NULL THEN
    v_reason := 'adjustment';
  END IF;

  -- Intentar obtener el ID del usuario autenticado de la sesión
  v_user_id := auth.uid();

  -- Insertar el registro de auditoría
  INSERT INTO public.inventory_transactions (
    tenant_id,
    variant_id,
    quantity_changed,
    reason,
    created_by
  ) VALUES (
    NEW.tenant_id,
    NEW.variant_id,
    v_quantity_changed,
    v_reason,
    v_user_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Crear el trigger en la tabla inventory_levels
DROP TRIGGER IF EXISTS trg_log_inventory_change ON public.inventory_levels;
CREATE TRIGGER trg_log_inventory_change
  AFTER UPDATE ON public.inventory_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inventory_change();

-- 6. Actualizar la función complete_pos_checkout para marcar las transacciones como 'sale'
-- Modificamos complete_pos_checkout para inyectar la variable de sesión 'sale'
CREATE OR REPLACE FUNCTION public.complete_pos_checkout(
  p_tenant_id uuid,
  p_customer_id uuid,
  p_items jsonb,
  p_discount_percent numeric DEFAULT 0,
  p_payment_method text DEFAULT NULL::text,
  p_cash_received numeric DEFAULT NULL::numeric,
  p_is_credit_sale boolean DEFAULT false,
  p_location_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item jsonb;
  v_enriched_items jsonb := '[]'::jsonb;
  v_variant_id uuid;
  v_quantity int;
  v_inventory inventory_levels%ROWTYPE;
  v_variant RECORD;
  v_order_id uuid;
  v_order_number int;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_gateway text;
  v_current_tenant uuid;
BEGIN
  -- Configurar la sesión para que el trigger reconozca que es una venta
  PERFORM set_config('app.current_inventory_reason', 'sale', true);

  -- Get current tenant from JWT or use the one provided
  v_current_tenant := public.current_tenant_id();
  
  -- For development: skip tenant check if current_tenant is null
  IF v_current_tenant IS NOT NULL AND v_current_tenant <> p_tenant_id THEN
    RAISE EXCEPTION 'tenant_not_allowed';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty_cart';
  END IF;

  IF p_discount_percent < 0 OR p_discount_percent > 100 THEN
    RAISE EXCEPTION 'invalid_discount';
  END IF;

  IF p_is_credit_sale AND p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_required_for_credit';
  END IF;

  IF p_customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM customers WHERE id = p_customer_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'customer_not_found';
  END IF;

  IF NOT p_is_credit_sale AND p_payment_method IS NULL THEN
    RAISE EXCEPTION 'payment_method_required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text));

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_item ->> 'variant_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::int;

    IF v_variant_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'invalid_cart_item';
    END IF;

    SELECT pv.id, pv.sku, pv.price_ars, COALESCE(p.nombre, p.title, 'Sin nombre') AS title
    INTO v_variant
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE pv.id = v_variant_id AND p.tenant_id = p_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'variant_not_found';
    END IF;

    SELECT * INTO v_inventory
    FROM inventory_levels
    WHERE tenant_id = p_tenant_id AND variant_id = v_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'inventory_not_found';
    END IF;

    IF v_inventory.available < v_quantity THEN
      RAISE EXCEPTION 'insufficient_stock';
    END IF;

    v_subtotal := v_subtotal + (v_variant.price_ars * v_quantity);
    v_enriched_items := v_enriched_items || jsonb_build_array(jsonb_build_object(
      'variant_id', v_variant.id,
      'quantity', v_quantity,
      'unit_price_ars', v_variant.price_ars,
      'title_snapshot', v_variant.title,
      'sku_snapshot', COALESCE(v_variant.sku, 'N/A')
    ));
  END LOOP;

  v_tax := ROUND(v_subtotal * 0.21);
  v_discount := ROUND(v_subtotal * (p_discount_percent / 100));
  v_total := ROUND(v_subtotal + v_tax - v_discount);

  IF NOT p_is_credit_sale AND p_payment_method = 'efectivo' AND COALESCE(p_cash_received, 0) < v_total THEN
    RAISE EXCEPTION 'cash_received_too_low';
  END IF;

  SELECT COALESCE(max(number), 0) + 1 INTO v_order_number
  FROM orders WHERE tenant_id = p_tenant_id;

  INSERT INTO orders (
    tenant_id, number, customer_id, channel, status, financial_status,
    subtotal_ars, tax_ars, total_ars, total, currency, placed_at
  ) VALUES (
    p_tenant_id, v_order_number, p_customer_id, 'pos', 'closed',
    CASE WHEN p_is_credit_sale THEN 'pending' ELSE 'paid' END,
    ROUND(v_subtotal), v_tax, v_total, v_total, 'ARS', now()
  ) RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_enriched_items)
  LOOP
    INSERT INTO order_items (
      tenant_id, order_id, variant_id, quantity, unit_price_ars, unit_price,
      tax_ars, title_snapshot, sku_snapshot
    ) VALUES (
      p_tenant_id, v_order_id, (v_item ->> 'variant_id')::uuid, (v_item ->> 'quantity')::int,
      (v_item ->> 'unit_price_ars')::numeric, (v_item ->> 'unit_price_ars')::numeric,
      ROUND((v_item ->> 'unit_price_ars')::numeric * (v_item ->> 'quantity')::int * 0.21),
      v_item ->> 'title_snapshot', v_item ->> 'sku_snapshot'
    );

    UPDATE inventory_levels
    SET on_hand = on_hand - (v_item ->> 'quantity')::int, updated_at = now()
    WHERE tenant_id = p_tenant_id AND variant_id = (v_item ->> 'variant_id')::uuid;
  END LOOP;

  IF NOT p_is_credit_sale THEN
    v_gateway := CASE p_payment_method
      WHEN 'tarjeta' THEN 'stripe'
      WHEN 'mp' THEN 'mercadopago'
      ELSE 'cash'
    END;

    INSERT INTO payments (
      tenant_id, order_id, gateway, status, amount, amount_ars, currency, method, processed_at
    ) VALUES (
      p_tenant_id, v_order_id, v_gateway, 'paid', v_total, v_total, 'ARS', p_payment_method, now()
    );
  END IF;

  -- Limpiar la sesión al finalizar
  PERFORM set_config('app.current_inventory_reason', '', true);

  RETURN jsonb_build_object(
    'ok', true, 'order_id', v_order_id, 'number', v_order_number,
    'subtotal_ars', ROUND(v_subtotal), 'tax_ars', v_tax,
    'discount_ars', v_discount, 'total_ars', v_total,
    'financial_status', CASE WHEN p_is_credit_sale THEN 'pending' ELSE 'paid' END
  );
END;
$$;

-- 4. Asegurar RLS en las tablas orders y order_items
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bypass RLS Orders" ON public.orders;
CREATE POLICY "Bypass RLS Orders" ON public.orders
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Bypass RLS Order Items" ON public.order_items;
CREATE POLICY "Bypass RLS Order Items" ON public.order_items
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);
