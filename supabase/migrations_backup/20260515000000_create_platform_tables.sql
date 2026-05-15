-- Create missing tables for platform
-- subscription_payments table
CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'ARS',
  status text DEFAULT 'pending_confirmation',
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

-- plans table
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  precio_mensual numeric NOT NULL DEFAULT 0,
  features jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW()
);

-- Insert default plan if not exists
INSERT INTO plans (nombre, precio_mensual, features)
VALUES 
  ('Básico', 15000, '{"online_store": true, "ml_affiliate": false, "multi_users": false}'),
  ('Profesional', 25000, '{"online_store": true, "ml_affiliate": true, "multi_users": true}')
ON CONFLICT DO NOTHING;

-- platform_settings table
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Insert default ML config
INSERT INTO platform_settings (key, value) 
VALUES ('ml_app_config', '{"app_client_id": "", "app_client_secret": "", "app_redirect_uri": ""}')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access
CREATE POLICY "subscription_payments_read" ON subscription_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "subscription_payments_all" ON subscription_payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "plans_read" ON plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans_all" ON plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "platform_settings_read" ON platform_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "platform_settings_all" ON platform_settings FOR ALL TO service_role USING (true) WITH CHECK (true);