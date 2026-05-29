-- =============================================================================
-- Migration: Secure locations table RLS Policies
--
-- Adds comprehensive RLS policies to `locations` for SELECT, INSERT, UPDATE, and DELETE.
-- Limits write access (INSERT, UPDATE, DELETE) only to owners and admins of the tenant.
-- =============================================================================

-- Ensure locations has RLS enabled
ALTER TABLE IF EXISTS public.locations ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy (All tenant members can view active/inactive branches)
DROP POLICY IF EXISTS "locations_select" ON public.locations;
CREATE POLICY "locations_select" ON public.locations
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

-- 2. INSERT Policy (Only owners/admins of the tenant can create branches)
DROP POLICY IF EXISTS "locations_insert" ON public.locations;
CREATE POLICY "locations_insert" ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 3. UPDATE Policy (Only owners/admins of the tenant can update branch details)
DROP POLICY IF EXISTS "locations_update" ON public.locations;
CREATE POLICY "locations_update" ON public.locations
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 4. DELETE Policy (Only owners/admins of the tenant can delete branches)
DROP POLICY IF EXISTS "locations_delete" ON public.locations;
CREATE POLICY "locations_delete" ON public.locations
  FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
