-- Add permissions and added_by columns to tenant_members table for securing credentials
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"sales_invoice": true, "sales_cancel": false, "sales_discount": false, "cash_open": true, "cash_drawer": false, "cash_close": true}'::jsonb;
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS added_by UUID;

-- Comment for documentation
COMMENT ON COLUMN tenant_members.permissions IS 'Granular permissions JSON override for the employee (database source of truth)';
COMMENT ON COLUMN tenant_members.added_by IS 'The owner user ID who created this member';
