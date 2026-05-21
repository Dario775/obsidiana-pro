-- Fix plans table: add missing columns referenced in the codebase
-- These columns are used by use-tenant.ts (Plan interface) and getPlanName()

ALTER TABLE plans ADD COLUMN IF NOT EXISTS nombre text;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();
ALTER TABLE plans ADD COLUMN IF NOT EXISTS description text;

-- Update existing rows to have nombre = name if nombre is null
UPDATE plans SET nombre = name WHERE nombre IS NULL AND name IS NOT NULL;

-- Add RLS policies for plans table (publicly readable)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_read_public" ON plans;
CREATE POLICY "plans_read_public" ON plans
  FOR SELECT
  TO public
  USING (true);

-- Add RLS policies for tenant_members table
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_members_select" ON tenant_members;
CREATE POLICY "tenant_members_select" ON tenant_members
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_members_insert" ON tenant_members;
CREATE POLICY "tenant_members_insert" ON tenant_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "tenant_members_service" ON tenant_members;
CREATE POLICY "tenant_members_service" ON tenant_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add RLS policies for locations table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations') THEN
    ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "locations_select" ON locations;
    CREATE POLICY "locations_select" ON locations
      FOR SELECT
      TO authenticated
      USING (
        tenant_id IN (
          SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
        )
      );
    
    DROP POLICY IF EXISTS "locations_service" ON locations;
    CREATE POLICY "locations_service" ON locations
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
