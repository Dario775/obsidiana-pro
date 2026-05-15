-- Add online store columns to products if not exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS available_online boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS online_reserved integer DEFAULT 0;

-- Add more columns to product_variants for online store
ALTER TABLE product_variants 
ADD COLUMN IF NOT EXISTS available_online boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS online_reserved integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS online_price numeric DEFAULT 0;