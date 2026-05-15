-- Function to increment ML product clicks
CREATE OR REPLACE FUNCTION increment_ml_clicks(p_item_id text, p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ml_products
  SET clicks = COALESCE(clicks, 0) + 1,
      updated_at = NOW()
  WHERE ml_item_id = p_item_id AND tenant_id = p_tenant_id;
END;
$$;