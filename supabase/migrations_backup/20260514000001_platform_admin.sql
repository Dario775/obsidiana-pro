-- Add platform admin column to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_platform_admin boolean DEFAULT false;