-- =====================================================
-- FIX: Convertir tenants.plan_id de text a uuid
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Actualizar valores 'free' al UUID del plan gratuito
UPDATE tenants SET plan_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
WHERE plan_id = 'free' OR plan_id IS NULL;

-- 2. Agregar foreign key si no existe
ALTER TABLE tenants ADD CONSTRAINT tenants_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL;

-- 3. Cambiar tipo de text a uuid
ALTER TABLE tenants ALTER COLUMN plan_id TYPE uuid USING plan_id::uuid;

-- 4. Actualizar default al UUID correcto
ALTER TABLE tenants ALTER COLUMN plan_id SET DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid;
