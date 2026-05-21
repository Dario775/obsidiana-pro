-- =====================================================
-- AUTH FLOW FIXES - Ejecutar UNA query a la vez
-- =====================================================

-- QUERY 1: Agregar columnas faltantes a plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS nombre text;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();
ALTER TABLE plans ADD COLUMN IF NOT EXISTS description text;
UPDATE plans SET nombre = name WHERE nombre IS NULL AND name IS NOT NULL;

-- QUERY 2: Agregar primary key a plans (si no existe)
ALTER TABLE plans ADD PRIMARY KEY (id);

-- QUERY 3: Habilitar RLS en plans y crear policy pública
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plans_read_public" ON plans;
CREATE POLICY "plans_read_public" ON plans FOR SELECT TO public USING (true);

-- QUERY 4: Habilitar RLS en tenant_members y crear policies
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_members_select" ON tenant_members;
CREATE POLICY "tenant_members_select" ON tenant_members FOR SELECT TO authenticated USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "tenant_members_insert" ON tenant_members;
CREATE POLICY "tenant_members_insert" ON tenant_members FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "tenant_members_service" ON tenant_members;
CREATE POLICY "tenant_members_service" ON tenant_members FOR ALL TO service_role USING (true) WITH CHECK (true);

-- QUERY 5: Crear tabla locations
CREATE TABLE IF NOT EXISTS locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  province text,
  postal_code text,
  phone text,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "locations_select" ON locations;
CREATE POLICY "locations_select" ON locations FOR SELECT TO authenticated USING (tenant_id IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "locations_service" ON locations;
CREATE POLICY "locations_service" ON locations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- QUERY 6: Crear locations default para tenants existentes
INSERT INTO locations (tenant_id, name, is_default)
SELECT t.id, 'Local Principal', true FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM locations l WHERE l.tenant_id = t.id);

-- QUERY 7: Agregar unique constraint a tenant_members
ALTER TABLE tenant_members ADD CONSTRAINT tenant_members_user_tenant_unique UNIQUE (user_id, tenant_id);

-- QUERY 8: Crear tenant_members para usuarios email/password existentes
INSERT INTO tenant_members (tenant_id, user_id, role)
SELECT (au.raw_user_meta_data->>'tenant_id')::uuid, au.id, 'owner'
FROM auth.users au
WHERE au.raw_user_meta_data->>'tenant_id' IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM tenant_members tm WHERE tm.user_id = au.id);

-- QUERY 9: Actualizar seed de plans (sin ON CONFLICT - usa UPDATE + INSERT separado)
-- Primero actualizar existentes
UPDATE plans SET
  name = CASE id
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' THEN 'Free'
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' THEN 'Business'
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3' THEN 'Pro'
    ELSE name END,
  nombre = CASE id
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' THEN 'Gratis'
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' THEN 'Negocio'
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3' THEN 'Profesional'
    ELSE nombre END,
  monthly_price = CASE id
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' THEN 0
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' THEN 15000
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3' THEN 35000
    ELSE monthly_price END,
  yearly_price = CASE id
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' THEN 0
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' THEN 150000
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3' THEN 350000
    ELSE yearly_price END,
  features = CASE id
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' THEN '{"pos": true, "inventory": true, "customers": true, "online_store": false, "analytics_basic": true}'::jsonb
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' THEN '{"pos": true, "inventory": true, "customers": true, "online_store": true, "analytics_basic": true, "analytics_advanced": true, "multi_user": true}'::jsonb
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3' THEN '{"pos": true, "inventory": true, "customers": true, "online_store": true, "analytics_basic": true, "analytics_advanced": true, "multi_user": true, "api_access": true, "priority_support": true}'::jsonb
    ELSE features END,
  max_products = CASE id
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' THEN 100
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' THEN 1000
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3' THEN 10000
    ELSE max_products END,
  max_branches = CASE id
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' THEN 1
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' THEN 3
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3' THEN 10
    ELSE max_branches END,
  online_store = CASE id
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' THEN false
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' THEN true
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3' THEN true
    ELSE online_store END,
  pos = CASE id
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' THEN true
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' THEN true
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3' THEN true
    ELSE pos END,
  description = CASE id
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' THEN 'Plan gratuito con funciones básicas'
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' THEN 'Plan para negocios en crecimiento'
    WHEN 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3' THEN 'Plan profesional con todas las funciones'
    ELSE description END
WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3');

-- Luego insertar los que no existan
INSERT INTO plans (id, name, nombre, monthly_price, yearly_price, features, max_products, max_branches, online_store, pos, description)
SELECT id, name, nombre, monthly_price, yearly_price, features, max_products, max_branches, online_store, pos, description
FROM (VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Free', 'Gratis', 0, 0, '{"pos": true, "inventory": true, "customers": true, "online_store": false, "analytics_basic": true}'::jsonb, 100, 1, false, true, 'Plan gratuito con funciones básicas'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Business', 'Negocio', 15000, 150000, '{"pos": true, "inventory": true, "customers": true, "online_store": true, "analytics_basic": true, "analytics_advanced": true, "multi_user": true}'::jsonb, 1000, 3, true, true, 'Plan para negocios en crecimiento'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Pro', 'Profesional', 35000, 350000, '{"pos": true, "inventory": true, "customers": true, "online_store": true, "analytics_basic": true, "analytics_advanced": true, "multi_user": true, "api_access": true, "priority_support": true}'::jsonb, 10000, 10, true, true, 'Plan profesional con todas las funciones')
) AS v(id, name, nombre, monthly_price, yearly_price, features, max_products, max_branches, online_store, pos, description)
WHERE NOT EXISTS (SELECT 1 FROM plans p WHERE p.id = v.id);
