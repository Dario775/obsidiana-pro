-- ML Affiliate Configuration v2
-- Stores can configure their ML affiliate ID and import products
-- Stores ML OAuth tokens now stored per tenant

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ml_affiliate_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ml_access_token text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ml_refresh_token text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ml_token_expires_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ml_user_id text;

-- ML imported products table
CREATE TABLE IF NOT EXISTS ml_products (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  ml_item_id text not null,
  title text,
  price numeric,
  currency text,
  thumbnail text,
  pictures jsonb,
  condition text,
  listing_type_id text,
  category_id text,
  attributes jsonb,
  description text,
  permalink text,
  affiliate_url text,
  clicks int not null default 0,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, ml_item_id)
);

CREATE INDEX IF NOT EXISTS ml_products_tenant_idx ON ml_products(tenant_id);
CREATE INDEX IF NOT EXISTS ml_products_item_idx ON ml_products(ml_item_id);

-- Function to refresh ML token for a tenant
CREATE OR REPLACE FUNCTION refresh_ml_token(p_tenant_id uuid)
RETURNS TABLE(new_access_token text, new_refresh_token text, new_expires_at timestamptz) AS $$
DECLARE
  v_tenantRecord RECORD;
  v_app_config jsonb;
  v_new_access_token text;
  v_new_refresh_token text;
  v_expires_in int;
BEGIN
  -- Get tenant ML credentials
  SELECT INTO v_tenantRecord 
    t.ml_access_token, 
    t.ml_refresh_token,
    t.ml_token_expires_at
  FROM tenants t WHERE t.id = p_tenant_id;

  -- Get platform ML app config
  SELECT value INTO v_app_config FROM platform_settings WHERE key = 'ml_app_config';

  -- If no refresh token, return current
  IF v_tenantRecord.ml_refresh_token IS NULL THEN
    RETURN QUERY SELECT v_tenantRecord.ml_access_token, v_tenantRecord.ml_refresh_token, v_tenantRecord.ml_token_expires_at;
    RETURN;
  END IF;

  -- Check if current token is still valid (expires at > now + 5 min buffer)
  IF v_tenantRecord.ml_token_expires_at IS NOT NULL 
     AND v_tenantRecord.ml_token_expires_at > NOW() + INTERVAL '5 minutes' THEN
    RETURN QUERY SELECT v_tenantRecord.ml_access_token, v_tenantRecord.ml_refresh_token, v_tenantRecord.ml_token_expires_at;
    RETURN;
  END IF;

  -- Need to refresh
  BEGIN
    -- Call ML API to refresh token
    v_new_access_token := (v_app_config->>'app_client_id'); -- placeholder
    v_new_refresh_token := v_tenantRecord.ml_refresh_token;
    v_expires_in := 21600; -- default 6 hours
    
    -- TODO: Make actual HTTP call to ML OAuth refresh endpoint
    -- This would require a database extension or RPC function
  EXCEPTION WHEN OTHERS THEN
    -- Return current tokens if refresh fails
    RETURN QUERY SELECT v_tenantRecord.ml_access_token, v_tenantRecord.ml_refresh_token, v_tenantRecord.ml_token_expires_at;
    RETURN;
  END;

  RETURN QUERY SELECT v_tenantRecord.ml_access_token, v_tenantRecord.ml_refresh_token, v_tenantRecord.ml_token_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to refresh token from app layer
CREATE OR REPLACE FUNCTION refresh_tenant_ml_token(p_tenant_id uuid)
RETURNS boolean AS $$
DECLARE
  v_tenant RECORD;
  v_app_config jsonb;
  v_response jsonb;
BEGIN
  -- Get tenant tokens
  SELECT INTO v_tenant 
    ml_access_token, ml_refresh_token, ml_token_expires_at
  FROM tenants WHERE id = p_tenant_id;

  -- Get platform app config
  SELECT value INTO v_app_config FROM platform_settings WHERE key = 'ml_app_config';

  -- Check if token is still valid (5 min buffer)
  IF v_tenant.ml_token_expires_at IS NOT NULL 
     AND v_tenant.ml_token_expires_at > NOW() + INTERVAL '5 minutes' THEN
    RETURN true; -- Token still valid
  END IF;

  -- Need to refresh
  IF v_tenant.ml_refresh_token IS NULL THEN
    RETURN false; -- No refresh token available
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;