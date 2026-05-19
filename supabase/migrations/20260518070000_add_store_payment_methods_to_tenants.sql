-- Add store_payment_methods column to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS store_payment_methods jsonb DEFAULT '[]'::jsonb;
