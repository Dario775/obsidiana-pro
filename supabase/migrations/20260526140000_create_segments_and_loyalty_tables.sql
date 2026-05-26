-- Migration: Create Customer Segments and Loyalty/Points Database Tables
-- Description: Registers robust schemas for customer grouping and loyalty reward tracking with multi-tenant RLS isolation.

-- 1. Crear Tabla de Segmentos de Clientes
CREATE TABLE IF NOT EXISTS public.customer_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'sell'::text,
  color text DEFAULT 'blue'::text,
  rule_type text NOT NULL CHECK (rule_type IN ('all', 'vip', 'debtors', 'marketing', 'has_phone', 'custom')),
  custom_rule jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Crear Tabla de Configuración de Programa de Puntos (Loyalty Settings)
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  points_per_ars_spent numeric DEFAULT 100 NOT NULL,
  ars_per_point_redeemed numeric DEFAULT 5 NOT NULL,
  min_points_to_redeem numeric DEFAULT 100 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Crear Tabla de Saldos Corrientes de Puntos de Clientes
CREATE TABLE IF NOT EXISTS public.customer_loyalty_balances (
  customer_id uuid PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  points_balance numeric DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 4. Crear Tabla de Registro de Movimientos de Puntos (Ledger de Auditoría)
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('earn', 'redeem', 'adjust')),
  reason text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 🔒 Habilitar RLS (Row Level Security) en todas las tablas creadas
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- 🛡️ Crear políticas estrictas de aislamiento por tenant_id (JWT Seguro)

-- Políticas para customer_segments
DROP POLICY IF EXISTS "isolation_customer_segments" ON public.customer_segments;
CREATE POLICY "isolation_customer_segments" ON public.customer_segments
FOR ALL TO authenticated
USING (tenant_id = public.current_tenant_id())
WITH CHECK (tenant_id = public.current_tenant_id());

-- Políticas para loyalty_settings
DROP POLICY IF EXISTS "isolation_loyalty_settings" ON public.loyalty_settings;
CREATE POLICY "isolation_loyalty_settings" ON public.loyalty_settings
FOR ALL TO authenticated
USING (tenant_id = public.current_tenant_id())
WITH CHECK (tenant_id = public.current_tenant_id());

-- Políticas para customer_loyalty_balances
DROP POLICY IF EXISTS "isolation_customer_loyalty_balances" ON public.customer_loyalty_balances;
CREATE POLICY "isolation_customer_loyalty_balances" ON public.customer_loyalty_balances
FOR ALL TO authenticated
USING (tenant_id = public.current_tenant_id())
WITH CHECK (tenant_id = public.current_tenant_id());

-- Políticas para loyalty_transactions
DROP POLICY IF EXISTS "isolation_loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "isolation_loyalty_transactions" ON public.loyalty_transactions
FOR ALL TO authenticated
USING (tenant_id = public.current_tenant_id())
WITH CHECK (tenant_id = public.current_tenant_id());

-- ⚡ Índices de Rendimiento para Consultas Rápidas
CREATE INDEX IF NOT EXISTS idx_customer_segments_tenant ON public.customer_segments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_balances_tenant ON public.customer_loyalty_balances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_tenant ON public.loyalty_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_customer ON public.loyalty_transactions(customer_id);
