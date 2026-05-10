-- Allow anonymous users to create tenant during sign-up
CREATE POLICY "tenants_insert_for_signup" ON tenants
FOR INSERT TO anon, authenticated
WITH CHECK (
  auth.role() IN ('anon', 'authenticated', 'service_role')
);

-- Allow read for authenticated users to see their own tenant
CREATE POLICY "tenants_read_for_signup" ON tenants
FOR SELECT TO authenticated
USING (true);

-- Allow service_role full access
CREATE POLICY "tenants_all_service" ON tenants
FOR ALL TO service_role
USING (true)
WITH CHECK (true);