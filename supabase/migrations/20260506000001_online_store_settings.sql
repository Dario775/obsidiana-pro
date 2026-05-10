-- Add online store settings columns
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS store_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS store_description TEXT,
ADD COLUMN IF NOT EXISTS store_theme VARCHAR(50) DEFAULT 'violet',
ADD COLUMN IF NOT EXISTS store_domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS store_logo_url TEXT,
ADD COLUMN IF NOT EXISTS store_banner_url TEXT,
ADD COLUMN IF NOT EXISTS store_social_instagram VARCHAR(255),
ADD COLUMN IF NOT EXISTS store_social_facebook VARCHAR(255),
ADD COLUMN IF NOT EXISTS store_social_whatsapp VARCHAR(255),
ADD COLUMN IF NOT EXISTS store_currency VARCHAR(10) DEFAULT 'ARS',
ADD COLUMN IF NOT EXISTS store_min_order_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS store_shipping_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS store_shipping_free_threshold INTEGER,
ADD COLUMN IF NOT EXISTS store_shipping_cost INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS store_active BOOLEAN DEFAULT false;

-- Note: online_store_enabled already exists as boolean