-- Add missing customer details columns to public.orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_city text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_province text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_postal_code text;
