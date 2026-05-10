-- Seed initial demo data

insert into plans (id, nombre, precio_mensual, features)
values
  ('00000000-0000-0000-0000-000000000001', 'Plan Pro', 49000, '{"pos": true, "inventory": true, "customers": true, "online_store": true, "analytics_basic": true}'::jsonb)
on conflict (id) do update set
  nombre = excluded.nombre,
  precio_mensual = excluded.precio_mensual,
  features = excluded.features;

insert into tenants (id, slug, nombre, plan_id, online_store_enabled, status)
values
  ('11111111-1111-1111-1111-111111111111', 'casa-central', 'Casa Central', '00000000-0000-0000-0000-000000000001', true, 'active')
on conflict (id) do update set
  slug = excluded.slug,
  nombre = excluded.nombre,
  plan_id = excluded.plan_id,
  online_store_enabled = excluded.online_store_enabled,
  status = excluded.status;

insert into customers (id, tenant_id, email, first_name, last_name, dni_cuit, accepts_marketing)
values
  ('54573d5c-23c0-44f3-83e8-78fecdbcb049', '11111111-1111-1111-1111-111111111111', 'consumidor-final@obsidiana.local', 'Consumidor', 'Final', '00-00000000-0', false)
on conflict (id) do update set
  email = excluded.email,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  dni_cuit = excluded.dni_cuit;

insert into products (id, tenant_id, title, slug, description, status, images, seo, nombre, sku, precio, costo)
values
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Auriculares Sony WH-1000XM4',
    'auriculares-sony-wh-1000xm4',
    'Auriculares inalambricos con cancelacion de ruido.',
    'active',
    '[]'::jsonb,
    '{}'::jsonb,
    'Auriculares Sony WH-1000XM4',
    'SNY-1000-B',
    350000,
    250000
  )
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  description = excluded.description,
  nombre = excluded.nombre,
  sku = excluded.sku,
  precio = excluded.precio,
  costo = excluded.costo;

insert into product_variants (id, tenant_id, product_id, sku, sku_variant, barcode, price_ars, options, atributos)
values
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'SNY-1000-B',
    'SNY-1000-B',
    '7123456789012',
    350000,
    '{}'::jsonb,
    '{}'::jsonb
  )
on conflict (id) do update set
  sku = excluded.sku,
  sku_variant = excluded.sku_variant,
  barcode = excluded.barcode,
  price_ars = excluded.price_ars;

insert into inventory_levels (tenant_id, variant_id, location_id, on_hand, committed)
values
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 12, 0)
on conflict (tenant_id, variant_id, location_id) do update set
  on_hand = excluded.on_hand,
  committed = excluded.committed,
  updated_at = now();
