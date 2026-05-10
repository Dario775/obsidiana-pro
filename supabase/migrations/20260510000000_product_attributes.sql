-- Product Attributes for Variants System
-- This adds configurable attributes (talla, color, material) per tenant

-- 1. Product attributes definition table
CREATE TABLE IF NOT EXISTS product_attributes (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  name text not null, -- e.g., "Talla", "Color", "Material"
  slug text not null, -- e.g., "talla", "color", "material"
  type text not null default 'select', -- "select", "color", "text"
  is_required boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS product_attributes_tenant_idx ON product_attributes(tenant_id);

-- 2. Attribute options/values (e.g., S/M/L for talla, Rojo/Azul for color)
CREATE TABLE IF NOT EXISTS product_attribute_options (
  id uuid primary key default uuid_generate_v4(),
  attribute_id uuid references product_attributes(id) on delete cascade not null,
  value text not null, -- e.g., "S", "M", "L", "Rojo"
  slug text not null, -- e.g., "s", "m", "l", "rojo"
  color text, -- hex color for color type (e.g., "#FF0000")
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (attribute_id, slug)
);

CREATE INDEX IF NOT EXISTS product_attribute_options_attribute_idx ON product_attribute_options(attribute_id);

-- 3. Product-level attribute assignments (which attributes apply to each product)
CREATE TABLE IF NOT EXISTS product_attribute_assignments (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade not null,
  attribute_id uuid references product_attributes(id) on delete cascade not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, attribute_id)
);

-- 4. Update product_variants to use variant_options for attribute combination
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS variant_options jsonb not null default '{}'::jsonb;