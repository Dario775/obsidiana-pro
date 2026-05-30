-- Migration: Grant authenticated access to platform_config so RLS is evaluated
-- Description: Allow authenticated users to query platform_config (subject to RLS policies)
-- Date: 2026-05-30

GRANT ALL ON TABLE public.platform_config TO authenticated;
