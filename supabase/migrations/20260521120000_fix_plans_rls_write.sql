-- Migration to fix plans table RLS write policies and update public.is_platform_admin() function

-- 1. Update the is_platform_admin() function to be robust and handle the production admin email as well as tenant settings
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_jwt_email text;
  v_tenant_id uuid;
BEGIN
  -- Get the email from the JWT
  v_jwt_email := auth.jwt() ->> 'email';
  
  -- Check for hardcoded system administrators
  IF v_jwt_email = 'admin@admin.com' OR v_jwt_email = 'admin@obsidiana.com' THEN
    RETURN TRUE;
  END IF;
  
  -- Check user metadata for platform admin flag
  IF coalesce((auth.jwt() -> 'user_metadata' ->> 'is_platform_admin')::boolean, false) = true THEN
    RETURN TRUE;
  END IF;

  -- Check if the tenant itself is a platform admin tenant
  v_tenant_id := public.current_tenant_id();
  IF v_tenant_id IS NOT NULL THEN
    SELECT coalesce(is_platform_admin, false) INTO v_is_admin
    FROM tenants
    WHERE id = v_tenant_id;
    RETURN coalesce(v_is_admin, false);
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Add write policies for the plans table
-- This allows platform admins to perform INSERT, UPDATE, and DELETE operations on plans
DROP POLICY IF EXISTS "plans_write_admin" ON plans;
CREATE POLICY "plans_write_admin" ON plans
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 3. Fix the deformed features array/object for existing plans (specifically the PRO plan)
-- We ensure all existing plans have a valid JSONB object for features instead of an empty array '[]'
UPDATE plans 
SET features = '{}'::jsonb 
WHERE jsonb_typeof(features) = 'array' OR features IS NULL;
