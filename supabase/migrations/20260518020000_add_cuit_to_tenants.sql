-- Add cuit column to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS cuit text;
