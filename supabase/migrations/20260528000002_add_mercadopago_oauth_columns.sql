-- Agregar columnas de OAuth de Mercado Pago a la tabla tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS store_mp_refresh_token TEXT NULL,
ADD COLUMN IF NOT EXISTS store_mp_user_id TEXT NULL;

COMMENT ON COLUMN public.tenants.store_mp_refresh_token IS 'Token de actualización de OAuth de Mercado Pago del tenant';
COMMENT ON COLUMN public.tenants.store_mp_user_id IS 'ID de cuenta de Mercado Pago del tenant';
