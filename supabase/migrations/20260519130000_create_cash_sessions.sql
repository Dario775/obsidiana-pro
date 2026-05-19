-- Migration: Create cash_sessions table for POS opening and closures
-- Description: Stores POS shift/session information, including initial amount, actual count, expected sales, and status.

CREATE TABLE IF NOT EXISTS public.cash_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    name text NOT NULL DEFAULT 'Caja #01',
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    initial_amount numeric NOT NULL DEFAULT 0,
    expected_amount numeric NOT NULL DEFAULT 0,
    actual_amount numeric NOT NULL DEFAULT 0,
    difference numeric NOT NULL DEFAULT 0,
    total_sales numeric NOT NULL DEFAULT 0,
    operations_count integer NOT NULL DEFAULT 0,
    sales_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
    arca_status text NOT NULL DEFAULT 'none' CHECK (arca_status IN ('none', 'pending', 'approved', 'failed')),
    arca_report_id text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for multi-tenancy
DROP POLICY IF EXISTS select_cash_sessions ON public.cash_sessions;
CREATE POLICY select_cash_sessions ON public.cash_sessions
    FOR SELECT
    USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS insert_cash_sessions ON public.cash_sessions;
CREATE POLICY insert_cash_sessions ON public.cash_sessions
    FOR INSERT
    WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS update_cash_sessions ON public.cash_sessions;
CREATE POLICY update_cash_sessions ON public.cash_sessions
    FOR UPDATE
    USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS delete_cash_sessions ON public.cash_sessions;
CREATE POLICY delete_cash_sessions ON public.cash_sessions
    FOR DELETE
    USING (tenant_id = public.current_tenant_id());

-- Bypass RLS to match orders behavior for development/anon testing
DROP POLICY IF EXISTS "Bypass RLS Cash Sessions" ON public.cash_sessions;
CREATE POLICY "Bypass RLS Cash Sessions" ON public.cash_sessions
    FOR ALL
    TO authenticated, anon
    USING (true)
    WITH CHECK (true);
