-- Removal of Mercado Libre Integration
-- This migration drops all tables and columns related to Mercado Libre affiliate and search features.

-- 1. Drop tables
DROP TABLE IF EXISTS public.ml_products CASCADE;
DROP TABLE IF EXISTS public.ml_clicks_log CASCADE;

-- 2. Remove columns from tenants
ALTER TABLE public.tenants 
DROP COLUMN IF EXISTS ml_access_token,
DROP COLUMN IF EXISTS ml_refresh_token,
DROP COLUMN IF EXISTS ml_user_id,
DROP COLUMN IF EXISTS ml_affiliate_id,
DROP COLUMN IF EXISTS ml_token_expires_at;

-- 3. Remove ML configuration from platform_settings
DELETE FROM public.platform_settings WHERE key = 'ml_app_config';
