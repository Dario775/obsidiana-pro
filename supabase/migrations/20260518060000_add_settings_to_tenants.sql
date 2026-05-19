-- Add settings column to tenants table to support flexible metadata storage (like shipping zones)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;
