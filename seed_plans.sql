INSERT INTO plans (id, name, monthly_price, yearly_price, features, max_products, max_branches, online_store, pos) 
VALUES 
('free', 'Plan Emprendedor', 0, 0, '{"pos": true, "inventory": true, "reports_basic": true}', 50, 1, false, true), 
('pro', 'Plan Negocio Pro', 15000, 150000, '{"pos": true, "inventory": true, "online_store": true, "mercadopago": true, "ml_sync": true, "reports_advanced": true}', 500, 3, true, true), 
('enterprise', 'Plan Corporativo', 45000, 450000, '{"pos": true, "inventory": true, "online_store": true, "mercadopago": true, "ml_sync": true, "reports_advanced": true, "multi_branch": true, "custom_domain": true}', 99999, 10, true, true) 
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  monthly_price = EXCLUDED.monthly_price, 
  features = EXCLUDED.features, 
  max_products = EXCLUDED.max_products, 
  online_store = EXCLUDED.online_store;
