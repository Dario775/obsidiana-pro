-- =============================================================================
-- Migration: Fix critical RLS vulnerabilities
-- 
-- Resolves:
--   1. Remove dangerous anon policies on `tenants` (INSERT + SELECT sin auth)
--   2. Add RLS to `platform_config` (had GRANT ALL to anon with no RLS)
--   3. Add authenticated tenant-scoped policies for payments and related tables
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TENANTS — Eliminar políticas anon peligrosas
-- ─────────────────────────────────────────────────────────────────────────────

-- Cualquier visitante sin auth podía insertar un tenant directamente
DROP POLICY IF EXISTS "tenants_insert_anon" ON public.tenants;

-- Cualquier visitante sin auth podía leer todos los tenants
DROP POLICY IF EXISTS "tenants_select_anon" ON public.tenants;

-- Esta política permitía a anon insertar usando una condición trivialmente true
DROP POLICY IF EXISTS "tenants_insert_for_signup" ON public.tenants;

-- Reemplazar "tenants_read_for_signup" (SELECT authenticated sin filtro) por una
-- política que solo permite leer el propio tenant
DROP POLICY IF EXISTS "tenants_read_for_signup" ON public.tenants;

-- Política de lectura segura: cada usuario solo ve su propio tenant
CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT
  TO authenticated
  USING (id = public.current_tenant_id());

-- La tienda pública necesita leer datos del tenant para renderizarse.
-- Esto se hace SIEMPRE via service_role (la policy service_role_full ya existe).
-- No es necesario exponer SELECT a anon.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PLATFORM_CONFIG — Habilitar RLS y bloquear acceso general
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

-- Revocar los GRANT que permitían a anon y authenticated leer/escribir sin RLS
-- (RLS estaba deshabilitado así que GRANT era suficiente para acceder)
REVOKE ALL ON TABLE public.platform_config FROM anon;
REVOKE ALL ON TABLE public.platform_config FROM authenticated;

-- Solo el service_role (server-side) puede acceder, o admins de plataforma
DROP POLICY IF EXISTS "platform_config_service_only" ON public.platform_config;
CREATE POLICY "platform_config_service_only" ON public.platform_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "platform_config_admin_only" ON public.platform_config;
CREATE POLICY "platform_config_admin_only" ON public.platform_config
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PAYMENTS — Habilitar RLS con aislamiento por tenant
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_service_role" ON public.payments;
CREATE POLICY "payments_service_role" ON public.payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "payments_tenant_isolation" ON public.payments;
CREATE POLICY "payments_tenant_isolation" ON public.payments
  FOR ALL
  TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. STOCK_MOVEMENTS — Habilitar RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movements_service_role" ON public.stock_movements;
CREATE POLICY "stock_movements_service_role" ON public.stock_movements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "stock_movements_tenant_isolation" ON public.stock_movements;
CREATE POLICY "stock_movements_tenant_isolation" ON public.stock_movements
  FOR ALL
  TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. STOCK_RESERVATIONS — Habilitar RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.stock_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_reservations_service_role" ON public.stock_reservations;
CREATE POLICY "stock_reservations_service_role" ON public.stock_reservations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "stock_reservations_tenant_isolation" ON public.stock_reservations;
CREATE POLICY "stock_reservations_tenant_isolation" ON public.stock_reservations
  FOR ALL
  TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SUBSCRIPTION_PAYMENTS — Habilitar RLS (datos financieros de suscripción)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_payments_service_role" ON public.subscription_payments;
CREATE POLICY "subscription_payments_service_role" ON public.subscription_payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tenants ven sus propios pagos; admins de plataforma ven todos
DROP POLICY IF EXISTS "subscription_payments_tenant_isolation" ON public.subscription_payments;
CREATE POLICY "subscription_payments_tenant_isolation" ON public.subscription_payments
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    OR public.is_platform_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SUPPLIERS — Habilitar RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_service_role" ON public.suppliers;
CREATE POLICY "suppliers_service_role" ON public.suppliers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "suppliers_tenant_isolation" ON public.suppliers;
CREATE POLICY "suppliers_tenant_isolation" ON public.suppliers
  FOR ALL
  TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
