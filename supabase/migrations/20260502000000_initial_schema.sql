-- Obsidiana initial schema
-- This schema matches the current Next.js app surface: tenants, plans, POS,
-- inventory, customers, orders and payments.

create extension if not exists "uuid-ossp";

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'tenant_id', '')::uuid,
    nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid,
    nullif(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::uuid
  )
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'admin@obsidiana.com'
$$;

create table plans (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  precio_mensual numeric not null default 0,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table tenants (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  nombre text not null,
  cuit text,
  condicion_iva text,
  status text not null default 'active',
  plan_id uuid references plans(id) on delete set null,
  online_store_enabled boolean not null default false,
  custom_domain text,
  domain text unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table tenant_members (
  user_id uuid references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  role text not null check (role in ('owner','admin','cashier','viewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

create table customers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  email text not null,
  phone text,
  dni_cuit text,
  first_name text,
  last_name text,
  accepts_marketing boolean not null default false,
  credit_limit numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  title text,
  slug text,
  description text,
  status text not null default 'active',
  images jsonb not null default '[]'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  -- Backwards-compatible columns used by older shared code/seeds.
  nombre text,
  sku text,
  precio numeric not null default 0,
  costo numeric not null default 0,
  descripcion text,
  is_published boolean not null default true,
  currency text not null default 'ARS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table product_variants (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  sku text,
  sku_variant text,
  barcode text,
  options jsonb not null default '{}'::jsonb,
  atributos jsonb not null default '{}'::jsonb,
  price_ars numeric not null default 0,
  requires_shipping boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table inventory_levels (
  tenant_id uuid references tenants(id) on delete cascade not null,
  variant_id uuid references product_variants(id) on delete cascade not null,
  location_id uuid not null default '00000000-0000-0000-0000-000000000001',
  on_hand int not null default 0,
  committed int not null default 0,
  available int generated always as (on_hand - committed) stored,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, variant_id, location_id)
);

-- Compatibility view for code/docs that still reference the earlier naming.
create view inventory_items as
select
  uuid_generate_v5(
    '00000000-0000-0000-0000-000000000000'::uuid,
    tenant_id::text || ':' || variant_id::text || ':' || location_id::text
  ) as id,
  tenant_id,
  variant_id,
  location_id,
  on_hand as quantity_on_hand,
  committed as quantity_reserved,
  updated_at as created_at
from inventory_levels;

create table stock_movements (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  variant_id uuid references product_variants(id) on delete cascade not null,
  type text not null check (type in ('in', 'out', 'adjustment', 'sale', 'return')),
  quantity int not null,
  channel text not null check (channel in ('pos', 'online', 'internal')),
  reference_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table stock_reservations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  variant_id uuid references product_variants(id) on delete cascade not null,
  quantity int not null,
  channel text not null check (channel in ('pos', 'online')),
  cart_id uuid,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  number int,
  customer_id uuid references customers(id) on delete set null,
  channel text not null check (channel in ('pos', 'online')) default 'pos',
  status text not null default 'pending',
  financial_status text not null default 'pending',
  fulfillment_status text default 'unfulfilled',
  subtotal_ars numeric not null default 0,
  tax_ars numeric not null default 0,
  total_ars numeric not null default 0,
  total numeric not null default 0,
  currency text not null default 'ARS',
  payment_status text default 'pending',
  invoice_id uuid,
  placed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tenant_id, number)
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  order_id uuid references orders(id) on delete cascade not null,
  variant_id uuid references product_variants(id) on delete set null,
  quantity int not null,
  unit_price_ars numeric not null default 0,
  unit_price numeric not null default 0,
  tax_ars numeric not null default 0,
  tax_rate numeric not null default 0.21,
  title_snapshot text,
  sku_snapshot text,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade not null,
  order_id uuid references orders(id) on delete cascade not null,
  gateway text not null default 'cash',
  status text not null default 'pending',
  amount_ars numeric not null default 0,
  currency text not null default 'ARS',
  method text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index customers_tenant_idx on customers(tenant_id);
create index products_tenant_idx on products(tenant_id);
create index product_variants_tenant_idx on product_variants(tenant_id);
create index orders_tenant_idx on orders(tenant_id);
create index orders_customer_idx on orders(customer_id);
create index payments_order_idx on payments(order_id);

alter table plans enable row level security;
alter table tenants enable row level security;
alter table tenant_members enable row level security;
alter table customers enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table inventory_levels enable row level security;
alter table stock_movements enable row level security;
alter table stock_reservations enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;

create policy "plans_readable" on plans
  for select using (true);

create policy "plans_platform_admin_write" on plans
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "tenants_select_own_or_admin" on tenants
  for select using (public.is_platform_admin() or id = public.current_tenant_id());

create policy "tenants_insert_for_signup_or_admin" on tenants
  for insert with check (auth.role() in ('anon', 'authenticated') or public.is_platform_admin());

create policy "tenants_update_own_or_admin" on tenants
  for update using (public.is_platform_admin() or id = public.current_tenant_id())
  with check (public.is_platform_admin() or id = public.current_tenant_id());

create policy "tenants_delete_admin" on tenants
  for delete using (public.is_platform_admin());

create policy "tenant_members_read_own_or_admin" on tenant_members
  for select using (public.is_platform_admin() or user_id = auth.uid() or tenant_id = public.current_tenant_id());

create policy "tenant_members_admin_write" on tenant_members
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "customers_tenant_access" on customers
  for all using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy "products_tenant_access" on products
  for all using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy "product_variants_tenant_access" on product_variants
  for all using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy "inventory_levels_tenant_access" on inventory_levels
  for all using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy "stock_movements_tenant_access" on stock_movements
  for all using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy "stock_reservations_tenant_access" on stock_reservations
  for all using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy "orders_tenant_access" on orders
  for all using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy "order_items_tenant_access" on order_items
  for all using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy "payments_tenant_access" on payments
  for all using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create or replace function reserve_stock(
  p_variant_id uuid,
  p_quantity int,
  p_cart_id uuid,
  p_ttl_minutes int default 15
) returns json
language plpgsql
security definer
as $$
declare
  v_inventory inventory_levels%rowtype;
begin
  select * into v_inventory
  from inventory_levels
  where variant_id = p_variant_id
    and tenant_id = public.current_tenant_id()
  for update;

  if not found then
    return json_build_object('ok', false, 'reason', 'item_not_found');
  end if;

  if v_inventory.available < p_quantity then
    return json_build_object('ok', false, 'reason', 'insufficient_stock');
  end if;

  insert into stock_reservations(tenant_id, variant_id, quantity, channel, cart_id, expires_at)
  values (v_inventory.tenant_id, p_variant_id, p_quantity, 'online', p_cart_id, now() + (p_ttl_minutes || ' minutes')::interval);

  update inventory_levels
  set committed = committed + p_quantity,
      updated_at = now()
  where tenant_id = v_inventory.tenant_id
    and variant_id = p_variant_id
    and location_id = v_inventory.location_id;

  return json_build_object('ok', true);
end;
$$;

create or replace function complete_pos_checkout(
  p_tenant_id uuid,
  p_customer_id uuid,
  p_items jsonb,
  p_discount_percent numeric default 0,
  p_payment_method text default null,
  p_cash_received numeric default null,
  p_is_credit_sale boolean default false,
  p_location_id uuid default '00000000-0000-0000-0000-000000000001'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_enriched_items jsonb := '[]'::jsonb;
  v_variant_id uuid;
  v_quantity int;
  v_inventory inventory_levels%rowtype;
  v_variant record;
  v_order_id uuid;
  v_order_number int;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_gateway text;
  v_current_tenant uuid := public.current_tenant_id();
begin
  if not public.is_platform_admin() and (v_current_tenant is null or v_current_tenant <> p_tenant_id) then
    raise exception 'tenant_not_allowed';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;

  if p_discount_percent < 0 or p_discount_percent > 100 then
    raise exception 'invalid_discount';
  end if;

  if p_is_credit_sale and p_customer_id is null then
    raise exception 'customer_required_for_credit';
  end if;

  if p_customer_id is not null and not exists (
    select 1 from customers where id = p_customer_id and tenant_id = p_tenant_id
  ) then
    raise exception 'customer_not_found';
  end if;

  if not p_is_credit_sale and p_payment_method is null then
    raise exception 'payment_method_required';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_tenant_id::text));

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item ->> 'variant_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::int;

    if v_variant_id is null or v_quantity is null or v_quantity <= 0 then
      raise exception 'invalid_cart_item';
    end if;

    select
      pv.id,
      pv.sku,
      pv.price_ars,
      coalesce(p.title, p.nombre, 'Sin nombre') as title
    into v_variant
    from product_variants pv
    join products p on p.id = pv.product_id
    where pv.id = v_variant_id
      and pv.tenant_id = p_tenant_id;

    if not found then
      raise exception 'variant_not_found';
    end if;

    select * into v_inventory
    from inventory_levels
    where tenant_id = p_tenant_id
      and variant_id = v_variant_id
      and location_id = p_location_id
    for update;

    if not found then
      raise exception 'inventory_not_found';
    end if;

    if v_inventory.available < v_quantity then
      raise exception 'insufficient_stock';
    end if;

    v_subtotal := v_subtotal + (v_variant.price_ars * v_quantity);
    v_enriched_items := v_enriched_items || jsonb_build_array(jsonb_build_object(
      'variant_id', v_variant.id,
      'quantity', v_quantity,
      'unit_price_ars', v_variant.price_ars,
      'title_snapshot', v_variant.title,
      'sku_snapshot', coalesce(v_variant.sku, 'N/A')
    ));
  end loop;

  v_tax := round(v_subtotal * 0.21);
  v_discount := round(v_subtotal * (p_discount_percent / 100));
  v_total := round(v_subtotal + v_tax - v_discount);

  if not p_is_credit_sale and p_payment_method = 'efectivo' and coalesce(p_cash_received, 0) < v_total then
    raise exception 'cash_received_too_low';
  end if;

  select coalesce(max(number), 0) + 1
  into v_order_number
  from orders
  where tenant_id = p_tenant_id;

  insert into orders (
    tenant_id,
    number,
    customer_id,
    channel,
    status,
    financial_status,
    subtotal_ars,
    tax_ars,
    total_ars,
    total,
    currency,
    placed_at
  ) values (
    p_tenant_id,
    v_order_number,
    p_customer_id,
    'pos',
    'closed',
    case when p_is_credit_sale then 'pending' else 'paid' end,
    round(v_subtotal),
    v_tax,
    v_total,
    v_total,
    'ARS',
    now()
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(v_enriched_items)
  loop
    insert into order_items (
      tenant_id,
      order_id,
      variant_id,
      quantity,
      unit_price_ars,
      unit_price,
      tax_ars,
      title_snapshot,
      sku_snapshot
    ) values (
      p_tenant_id,
      v_order_id,
      (v_item ->> 'variant_id')::uuid,
      (v_item ->> 'quantity')::int,
      (v_item ->> 'unit_price_ars')::numeric,
      (v_item ->> 'unit_price_ars')::numeric,
      round((v_item ->> 'unit_price_ars')::numeric * (v_item ->> 'quantity')::int * 0.21),
      v_item ->> 'title_snapshot',
      v_item ->> 'sku_snapshot'
    );

    update inventory_levels
    set on_hand = on_hand - (v_item ->> 'quantity')::int,
        updated_at = now()
    where tenant_id = p_tenant_id
      and variant_id = (v_item ->> 'variant_id')::uuid
      and location_id = p_location_id;
  end loop;

  if not p_is_credit_sale then
    v_gateway := case p_payment_method
      when 'tarjeta' then 'stripe'
      when 'mp' then 'mercadopago'
      else 'cash'
    end;

    insert into payments (
      tenant_id,
      order_id,
      gateway,
      status,
      amount_ars,
      currency,
      method,
      processed_at
    ) values (
      p_tenant_id,
      v_order_id,
      v_gateway,
      'paid',
      v_total,
      'ARS',
      p_payment_method,
      now()
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'number', v_order_number,
    'subtotal_ars', round(v_subtotal),
    'tax_ars', v_tax,
    'discount_ars', v_discount,
    'total_ars', v_total,
    'financial_status', case when p_is_credit_sale then 'pending' else 'paid' end
  );
end;
$$;

grant execute on function complete_pos_checkout(uuid, uuid, jsonb, numeric, text, numeric, boolean, uuid) to authenticated;
