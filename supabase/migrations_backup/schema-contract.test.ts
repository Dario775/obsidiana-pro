import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const schema = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260502000000_initial_schema.sql'),
  'utf8'
);

describe('Supabase schema contract', () => {
  it('contains the app-facing tables used by POS, inventory, customers and payments', () => {
    for (const table of [
      'customers',
      'inventory_levels',
      'orders',
      'order_items',
      'payments',
      'product_variants',
      'products',
      'tenants',
    ]) {
      expect(schema).toContain(`create table ${table}`);
    }
  });

  it('keeps tenant-aware RLS policies on write-heavy tables', () => {
    for (const policy of [
      'customers_tenant_access',
      'inventory_levels_tenant_access',
      'orders_tenant_access',
      'order_items_tenant_access',
      'payments_tenant_access',
      'products_tenant_access',
      'product_variants_tenant_access',
    ]) {
      expect(schema).toContain(`create policy "${policy}"`);
    }
  });

  it('defines a transactional POS checkout RPC with stock locking', () => {
    expect(schema).toContain('create or replace function complete_pos_checkout');
    expect(schema).toContain('pg_advisory_xact_lock');
    expect(schema).toContain('for update');
    expect(schema).toContain('raise exception');
    expect(schema).toContain('grant execute on function complete_pos_checkout');
  });
});
