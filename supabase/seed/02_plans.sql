-- Seed plans for development
INSERT INTO plans (id, name, nombre, monthly_price, yearly_price, features, max_products, max_branches, online_store, pos, description) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Free', 'Gratis', 0, 0, '{"pos": true, "inventory": true, "customers": true, "online_store": false, "analytics_basic": true}'::jsonb, 100, 1, false, true, 'Plan gratuito con funciones básicas'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Business', 'Negocio', 15000, 150000, '{"pos": true, "inventory": true, "customers": true, "online_store": true, "analytics_basic": true, "analytics_advanced": true, "multi_user": true}'::jsonb, 1000, 3, true, true, 'Plan para negocios en crecimiento'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Pro', 'Profesional', 35000, 350000, '{"pos": true, "inventory": true, "customers": true, "online_store": true, "analytics_basic": true, "analytics_advanced": true, "multi_user": true, "api_access": true, "priority_support": true}'::jsonb, 10000, 10, true, true, 'Plan profesional con todas las funciones')
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  nombre = excluded.nombre,
  monthly_price = excluded.monthly_price,
  yearly_price = excluded.yearly_price,
  features = excluded.features,
  max_products = excluded.max_products,
  max_branches = excluded.max_branches,
  online_store = excluded.online_store,
  pos = excluded.pos,
  description = excluded.description;

-- Update demo tenant to Business plan with online store enabled
UPDATE tenants 
SET 
  plan_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  online_store_enabled = true
WHERE id = '11111111-1111-1111-1111-111111111111';
