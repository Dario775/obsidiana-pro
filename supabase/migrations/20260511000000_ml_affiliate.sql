-- ML Affiliate Configuration
-- Stores can configure their ML affiliate ID and import products

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ml_affiliate_id text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ml_access_token text;
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
 Permalink text,
  -- Affiliate tracking
  affiliate_url text,
  clicks int not null default 0,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, ml_item_id)
);

CREATE INDEX IF NOT EXISTS ml_products_tenant_idx ON ml_products(tenant_id);
CREATE INDEX IF NOT EXISTS ml_products_item_idx ON ml_products(ml_item_id);