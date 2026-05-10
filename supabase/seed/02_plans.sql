-- Seed plans for development
INSERT INTO plans (id, nombre, precio_mensual, features) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Starter', 0, '{"pos": true, "inventory": true, "customers": true, "online_store": false, "analytics_basic": true}'::jsonb),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Business', 15000, '{"pos": true, "inventory": true, "customers": true, "online_store": true, "analytics_basic": true, "analytics_advanced": true, "multi_user": true}'::jsonb),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Pro', 35000, '{"pos": true, "inventory": true, "customers": true, "online_store": true, "analytics_basic": true, "analytics_advanced": true, "multi_user": true, "api_access": true, "priority_support": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  nombre = excluded.nombre,
  precio_mensual = excluded.precio_mensual,
  features = excluded.features;

-- Update demo tenant to Business plan with online store enabled
UPDATE tenants 
SET 
  plan_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  online_store_enabled = true
WHERE id = '11111111-1111-1111-1111-111111111111';
