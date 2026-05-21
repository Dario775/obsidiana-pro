-- Set default value for plan_id column in tenants table to free plan UUID
ALTER TABLE public.tenants ALTER COLUMN plan_id SET DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid;
