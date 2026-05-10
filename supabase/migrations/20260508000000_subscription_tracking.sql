-- Add subscription tracking columns to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_started_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS paid_until timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';

-- Create payments table for subscription history
CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES plans(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'ARS',
  payment_method text,
  transaction_id text,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_payments
DROP POLICY IF EXISTS "tenant can view own payments" ON subscription_payments;
CREATE POLICY "tenant can view own payments" ON subscription_payments
  FOR SELECT USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- Add sample payment history records
INSERT INTO subscription_payments (id, tenant_id, plan_id, amount, payment_method, status, paid_at) VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 15000, 'transferencia', 'completed', '2026-04-08'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 15000, 'transferencia', 'completed', '2026-05-08')
ON CONFLICT DO NOTHING;

-- Update tenant with current subscription info
UPDATE tenants SET
  plan_started_at = '2026-04-08',
  paid_until = '2026-06-08',
  subscription_status = 'active'
WHERE id = '11111111-1111-1111-1111-111111111111';