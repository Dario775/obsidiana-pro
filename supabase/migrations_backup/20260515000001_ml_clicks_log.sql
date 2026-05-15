-- ML Click Tracking
-- Detailed click logging for analytics

CREATE TABLE IF NOT EXISTS ml_clicks_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  ml_item_id text NOT NULL,
  clicked_at timestamptz NOT NULL DEFAULT NOW(),
  source_url text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS ml_clicks_log_tenant_idx ON ml_clicks_log(tenant_id);
CREATE INDEX IF NOT EXISTS ml_clicks_log_item_idx ON ml_clicks_log(ml_item_id);
CREATE INDEX IF NOT EXISTS ml_clicks_log_date_idx ON ml_clicks_log(clicked_at DESC);

-- View for ML affiliate stats per tenant
CREATE OR REPLACE VIEW ml_affiliate_stats AS
SELECT 
  t.id as tenant_id,
  t.nombre as tenant_name,
  COUNT(mp.id) as total_products,
  SUM(mp.clicks) as total_clicks,
  COUNT(CASE WHEN mp.clicks > 0 THEN 1 END) as products_with_clicks
FROM tenants t
LEFT JOIN ml_products mp ON mp.tenant_id = t.id
WHERE t.ml_affiliate_id IS NOT NULL
GROUP BY t.id, t.nombre;

-- Function to get monthly stats
CREATE OR REPLACE VIEW ml_monthly_clicks AS
SELECT 
  tenant_id,
  ml_item_id,
  DATE_TRUNC('month', clicked_at) as month,
  COUNT(*) as clicks
FROM ml_clicks_log
GROUP BY tenant_id, ml_item_id, DATE_TRUNC('month', clicked_at);