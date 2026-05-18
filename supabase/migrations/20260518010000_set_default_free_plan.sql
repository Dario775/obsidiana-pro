-- Set default value for plan_id column in tenants table to 'free'
ALTER TABLE public.tenants ALTER COLUMN plan_id SET DEFAULT 'free';
