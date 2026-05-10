-- =====================================================
-- OBSIDIANA PRO - Complete Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Tenants (multi-tenant)
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  slug text UNIQUE NOT NULL,
  status text DEFAULT 'active',
  status_reason text,
  address text,
  phone text,
  email text,
  logo_url text,
  banner_url text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  -- Online Store
  store_name text,
  store_description text,
  store_domain text,
  store_active boolean DEFAULT false,
  store_theme text DEFAULT 'violet',
  store_template text DEFAULT 'classic',
  store_banners jsonb DEFAULT '[]',
  store_tagline text,
  store_currency text DEFAULT 'ARS',
  store_min_order_amount numeric DEFAULT 0,
  store_shipping_enabled boolean DEFAULT true,
  store_shipping_cost numeric DEFAULT 0,
  store_shipping_free_threshold numeric DEFAULT 0,
  store_social_instagram text,
  store_social_facebook text,
  store_social_whatsapp text,
  -- ML Affiliate
  ml_affiliate_id text,
  ml_access_token text,
  ml_refresh_token text,
  ml_token_expires_at timestamptz,
  ml_user_id text,
  -- Plan & Billing
  plan_id text,
  subscription_status text,
  subscription_expires_at timestamptz,
  online_store_enabled boolean DEFAULT false,
  is_platform_admin boolean DEFAULT false,
  is_demo boolean DEFAULT false
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  description text,
  sku text,
  status text DEFAULT 'active',
  category_id uuid,
  images jsonb DEFAULT '[]',
  available_online boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  sku text,
  price_ars numeric DEFAULT 0,
  price_usd numeric DEFAULT 0,
  cost_ars numeric DEFAULT 0,
  created_at timestamptz DEFAULT NOW()
);

-- Product Attributes (for variants)
CREATE TABLE IF NOT EXISTS product_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_attribute_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id uuid REFERENCES product_attributes(id) ON DELETE CASCADE NOT NULL,
  value text NOT NULL,
  slug text NOT NULL,
  sort_order int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_attribute_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE NOT NULL,
  attribute_id uuid REFERENCES product_attributes(id) ON DELETE CASCADE NOT NULL,
  option_id uuid REFERENCES product_attribute_options(id) ON DELETE CASCADE NOT NULL
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE NOT NULL,
  on_hand int DEFAULT 0,
  committed int DEFAULT 0,
  reorder_point int DEFAULT 0,
  updated_at timestamptz DEFAULT NOW()
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid,
  quantity int NOT NULL,
  type text NOT NULL,
  reference_id uuid,
  notes text,
  created_at timestamptz DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  email text,
  phone text,
  document_type text,
  document_number text,
  address text,
  city text,
  province text,
  zip_code text,
  notes text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  subtotal_ars numeric DEFAULT 0,
  shipping_ars numeric DEFAULT 0,
  total_ars numeric DEFAULT 0,
  payment_method text,
  shipping_method text,
  notes text,
  shipping_address text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity int DEFAULT 1,
  unit_price_ars numeric DEFAULT 0,
  total_ars numeric DEFAULT 0
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  method text NOT NULL,
  amount numeric NOT NULL,
  status text DEFAULT 'pending',
  transaction_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz DEFAULT NOW()
);

-- Stock Reservations (POS)
CREATE TABLE IF NOT EXISTS stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE NOT NULL,
  quantity int NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- =====================================================
-- PLATFORM TABLES
-- =====================================================

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  monthly_price numeric DEFAULT 0,
  yearly_price numeric DEFAULT 0,
  features jsonb DEFAULT '[]',
  max_products int,
  max_branches int,
  online_store boolean DEFAULT false,
  pos boolean DEFAULT false
);

-- Tenant Members
CREATE TABLE IF NOT EXISTS tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT NOW()
);

-- Platform Config
CREATE TABLE IF NOT EXISTS platform_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT NOW()
);

-- Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Subscription Payments
CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'ARS',
  status text DEFAULT 'pending',
  payment_method text,
  transaction_id text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

-- =====================================================
-- ML AFFILIATE TABLES
-- =====================================================

-- ML Products (imported from Mercado Libre)
CREATE TABLE IF NOT EXISTS ml_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  ml_item_id text NOT NULL,
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
  clicks int DEFAULT 0,
  imported_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(tenant_id, ml_item_id)
);

-- ML Clicks Log (detailed tracking)
CREATE TABLE IF NOT EXISTS ml_clicks_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  ml_item_id text NOT NULL,
  clicked_at timestamptz DEFAULT NOW(),
  source_url text,
  user_agent text
);

-- =====================================================
-- GLOBAL CATALOG
-- =====================================================

CREATE TABLE IF NOT EXISTS global_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ml_item_id text UNIQUE,
  title text,
  category_id text,
  category_name text,
  price numeric,
  thumbnail text,
  pictures jsonb,
  attributes jsonb,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_global_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_product_id uuid REFERENCES global_catalog(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE(global_product_id, tenant_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory_levels(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_ml_products_tenant ON ml_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_products_item ON ml_products(ml_item_id);
CREATE INDEX IF NOT EXISTS idx_ml_clicks_tenant ON ml_clicks_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ml_clicks_item ON ml_clicks_log(ml_item_id);
CREATE INDEX IF NOT EXISTS idx_ml_clicks_date ON ml_clicks_log(clicked_at DESC);

-- =====================================================
-- SEED DATA (PLANS)
-- =====================================================

INSERT INTO plans (id, name, monthly_price, yearly_price, features, max_products, max_branches, online_store, pos) VALUES
('free', 'Gratis', 0, 0, '["basic-pos", "low-stock-alerts"]', 50, 1, false, true),
('starter', 'Inicial', 1999, 19990, '["full-pos", "online-store", "basic-reports"]', 200, 2, true, true),
('pro', 'Profesional', 4999, 49990, '["multi-branch", "full-reports", "priority-support"]', 1000, 5, true, true),
('enterprise', 'Empresarial', 9999, 99990, '["unlimited", "api-access", "dedicated-support"]', 999999, 999, true, true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS POLICIES (Optional - Disable if needed)
-- =====================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_clicks_log ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access
CREATE POLICY "service_role_full_access" ON tenants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON product_variants FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON inventory_levels FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON customers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON ml_products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_full_access" ON ml_clicks_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- DONE!
-- =====================================================

SELECT 'Obsidiana Pro Schema Created Successfully!' as message;
SELECT COUNT(*) as tables_created FROM information_schema.tables WHERE table_schema = 'public';