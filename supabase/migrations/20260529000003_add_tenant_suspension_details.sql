-- Add suspension tracing columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

-- Comments for documentation
COMMENT ON COLUMN tenants.suspended_at IS 'Timestamp of when the tenant account was suspended';
COMMENT ON COLUMN tenants.suspension_reason IS 'The reason or notes explaining why the tenant was suspended';
