-- Completely disable RLS for development
ALTER TABLE tenants OWNER TO postgres;
DROP POLICY IF EXISTS "tenants_all" ON tenants;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

ALTER TABLE tenant_members OWNER TO postgres;
DROP POLICY IF EXISTS "tenant_members_all" ON tenant_members;
ALTER TABLE tenant_members DISABLE ROW LEVEL SECURITY;

ALTER TABLE plans OWNER TO postgres;
DROP POLICY IF EXISTS "plans_all" ON plans;
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;

ALTER TABLE customers OWNER TO postgres;
DROP POLICY IF EXISTS "customers_all" ON customers;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

ALTER TABLE products OWNER TO postgres;
DROP POLICY IF EXISTS "products_all" ON products;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

ALTER TABLE product_variants OWNER TO postgres;
DROP POLICY IF EXISTS "product_variants_all" ON product_variants;
ALTER TABLE product_variants DISABLE ROW LEVEL SECURITY;

ALTER TABLE inventory_levels OWNER TO postgres;
DROP POLICY IF EXISTS "inventory_levels_all" ON inventory_levels;
ALTER TABLE inventory_levels DISABLE ROW LEVEL SECURITY;

ALTER TABLE stock_movements OWNER TO postgres;
DROP POLICY IF EXISTS "stock_movements_all" ON stock_movements;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;

ALTER TABLE orders OWNER TO postgres;
DROP POLICY IF EXISTS "orders_all" ON orders;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

ALTER TABLE order_items OWNER TO postgres;
DROP POLICY IF EXISTS "order_items_all" ON order_items;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

ALTER TABLE payments OWNER TO postgres;
DROP POLICY IF EXISTS "payments_all" ON payments;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

ALTER TABLE stock_reservations OWNER TO postgres;
DROP POLICY IF EXISTS "stock_reservations_all" ON stock_reservations;
ALTER TABLE stock_reservations DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA PUBLIC TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA PUBLIC TO postgres;