-- Add max_users column to plans table for dynamic limit configurations
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;

-- Update existing plans to have the default value if any are null
UPDATE plans SET max_users = 5 WHERE max_users IS NULL;

-- Comment for documentation
COMMENT ON COLUMN plans.max_users IS 'Maximum number of additional users (team members) allowed per tenant on this plan';
