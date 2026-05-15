-- Migration: Fix all RLS policies for development
-- Run this to make all tables writable by authenticated users

-- Tenants
DROP POLICY IF EXISTS "tenants_select_own_or_admin" ON tenants;
DROP POLICY IF EXISTS "tenants_insert_for_signup_or_admin" ON tenants;
DROP POLICY IF EXISTS "tenants_update_own_or_admin" ON tenants;
DROP POLICY IF EXISTS "tenants_delete_admin" ON tenants;
CREATE POLICY "tenants_all" ON tenants FOR ALL USING (auth.role() = 'authenticated');

-- Tenant Members
DROP POLICY IF EXISTS "tenant_members_read_own_or_admin" ON tenant_members;
DROP POLICY IF EXISTS "tenant_members_admin_write" ON tenant_members;
CREATE POLICY "tenant_members_all" ON tenant_members FOR ALL USING (auth.role() = 'authenticated');

-- Plans
DROP POLICY IF EXISTS "plans_readable" ON plans;
DROP POLICY IF EXISTS "plans_platform_admin_write" ON plans;
CREATE POLICY "plans_all" ON plans FOR ALL USING (auth.role() = 'authenticated');

-- Customers
DROP POLICY IF EXISTS "customers_tenant_access" ON customers;
CREATE POLICY "customers_all" ON customers FOR ALL USING (auth.role() = 'authenticated');

-- Products
DROP POLICY IF EXISTS "products_tenant_access" ON products;
CREATE POLICY "products_all" ON products FOR ALL USING (auth.role() = 'authenticated');

-- Product Variants
DROP POLICY IF EXISTS "product_variants_tenant_access" ON product_variants;
CREATE POLICY "product_variants_all" ON product_variants FOR ALL USING (auth.role() = 'authenticated');

-- Inventory Levels
DROP POLICY IF EXISTS "inventory_levels_tenant_access" ON inventory_levels;
CREATE POLICY "inventory_levels_all" ON inventory_levels FOR ALL USING (auth.role() = 'authenticated');

-- Stock Movements
DROP POLICY IF EXISTS "stock_movements_tenant_access" ON stock_movements;
CREATE POLICY "stock_movements_all" ON stock_movements FOR ALL USING (auth.role() = 'authenticated');

-- Stock Reservations
DROP POLICY IF EXISTS "stock_reservations_tenant_access" ON stock_reservations;
CREATE POLICY "stock_reservations_all" ON stock_reservations FOR ALL USING (auth.role() = 'authenticated');

-- Orders
DROP POLICY IF EXISTS "orders_tenant_access" ON orders;
CREATE POLICY "orders_all" ON orders FOR ALL USING (auth.role() = 'authenticated');

-- Order Items
DROP POLICY IF EXISTS "order_items_tenant_access" ON order_items;
CREATE POLICY "order_items_all" ON order_items FOR ALL USING (auth.role() = 'authenticated');

-- Payments
DROP POLICY IF EXISTS "payments_tenant_access" ON payments;
CREATE POLICY "payments_all" ON payments FOR ALL USING (auth.role() = 'authenticated');