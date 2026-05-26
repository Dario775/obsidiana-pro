-- Migration: Link payments to cash sessions
-- Description: Adds a cash_session_id column to payments and updates complete_pos_checkout to automatically populate it.

-- 1. Agregar columna cash_session_id a la tabla payments si no existe
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS cash_session_id uuid REFERENCES public.cash_sessions(id) ON DELETE SET NULL;

-- 2. Crear un índice para mejorar las consultas por sesión
CREATE INDEX IF NOT EXISTS idx_payments_cash_session ON public.payments(cash_session_id);

-- 3. Actualizar la función complete_pos_checkout para poblar automáticamente la sesión activa
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
  v_cash_session_id uuid;
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

  -- Buscar sesión de caja abierta para esta venta
  SELECT id INTO v_cash_session_id
  FROM public.cash_sessions
  WHERE tenant_id = p_tenant_id AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

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
      tenant_id, order_id, gateway, status, amount, amount_ars, currency, method, processed_at, cash_session_id
    ) VALUES (
      p_tenant_id, v_order_id, v_gateway, 'paid', v_total, v_total, 'ARS', p_payment_method, now(), v_cash_session_id
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
