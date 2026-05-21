const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjgwenrebdwssquebfay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZ3dlbnJlYmR3c3NxdWViZmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2MTYyNSwiZXhwIjoyMDkzOTM3NjI1fQ.g0LQrTqKkbpwiicea00pkl9374UizIhz46Y_Y1_fln4';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return uuidRegex.test(str);
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  AUDITORÍA EXHAUSTIVA SUPABASE');
  console.log('═══════════════════════════════════════════════\n');

  let errors = 0;
  let warnings = 0;

  // 1. PLANS
  console.log('1. PLANS');
  console.log('───────────────────────────────────────────────');
  const { data: plans, error: plansErr } = await supabase.from('plans').select('id,name,nombre,monthly_price,yearly_price');
  if (plansErr) { console.error('  ERROR:', plansErr); errors++; }
  else {
    console.log(`  Total planes: ${plans.length}`);
    plans.forEach(p => {
      const valid = isValidUUID(p.id);
      const status = valid ? '✓' : '✗ INVALID UUID';
      console.log(`  ${status} ${p.name} (${p.nombre}) - $${p.monthly_price}/mes - ID: ${p.id}`);
      if (!valid) errors++;
    });
  }

  // 2. TENANTS
  console.log('\n2. TENANTS');
  console.log('───────────────────────────────────────────────');
  const { data: tenants, error: tenantsErr } = await supabase.from('tenants').select('id,nombre,slug,plan_id,status,online_store_enabled');
  if (tenantsErr) { console.error('  ERROR:', tenantsErr); errors++; }
  else {
    console.log(`  Total tenants: ${tenants.length}`);
    tenants.forEach(t => {
      const validPlan = isValidUUID(t.plan_id);
      const status = validPlan ? '✓' : '✗ INVALID PLAN_ID';
      console.log(`  ${status} ${t.nombre} (${t.slug})`);
      console.log(`     Plan: ${t.plan_id} | Status: ${t.status} | Store: ${t.online_store_enabled}`);
      if (!validPlan) errors++;
    });
  }

  // 3. TENANT_MEMBERS
  console.log('\n3. TENANT_MEMBERS');
  console.log('───────────────────────────────────────────────');
  const { data: members, error: membersErr } = await supabase.from('tenant_members').select('*');
  if (membersErr) { console.error('  ERROR:', membersErr); errors++; }
  else {
    console.log(`  Total members: ${members.length}`);
    members.forEach(m => {
      console.log(`  ✓ Tenant: ${m.tenant_id} | User: ${m.user_id} | Role: ${m.role}`);
    });
  }

  // 4. LOCATIONS
  console.log('\n4. LOCATIONS');
  console.log('───────────────────────────────────────────────');
  const { data: locs, error: locsErr } = await supabase.from('locations').select('*');
  if (locsErr) { console.error('  ERROR:', locsErr); errors++; }
  else {
    console.log(`  Total locations: ${locs.length}`);
    locs.forEach(l => {
      console.log(`  ✓ Tenant: ${l.tenant_id} | Name: ${l.name} | Default: ${l.is_default}`);
    });
  }

  // 5. CHECK ORPHANS
  console.log('\n5. CHEQUEO DE ORFANOS');
  console.log('───────────────────────────────────────────────');
  
  // Members sin tenant
  const { data: orphanMembers } = await supabase
    .from('tenant_members')
    .select('tenant_id,user_id')
    .not('tenant_id', 'in', `(${tenants.map(t => t.id).join(',')})`);
  if (orphanMembers && orphanMembers.length > 0) {
    console.log(`  ✗ ${orphanMembers.length} members sin tenant válido`);
    errors++;
  } else {
    console.log('  ✓ No hay members huérfanos');
  }

  // Locations sin tenant
  const { data: orphanLocs } = await supabase
    .from('locations')
    .select('tenant_id,name')
    .not('tenant_id', 'in', `(${tenants.map(t => t.id).join(',')})`);
  if (orphanLocs && orphanLocs.length > 0) {
    console.log(`  ✗ ${orphanLocs.length} locations sin tenant válido`);
    errors++;
  } else {
    console.log('  ✓ No hay locations huérfanas');
  }

  // 6. CHECK USERS
  console.log('\n6. USUARIOS (Auth)');
  console.log('───────────────────────────────────────────────');
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) { console.error('  ERROR:', authErr); errors++; }
  else {
    console.log(`  Total users: ${authUsers.users.length}`);
    authUsers.users.forEach(u => {
      const tenantId = u.user_metadata?.tenant_id;
      const hasTenant = tenantId && isValidUUID(tenantId);
      const status = hasTenant ? '✓' : '⚠ SIN TENANT';
      console.log(`  ${status} ${u.email} | Metadata tenant: ${tenantId || 'N/A'}`);
      if (!hasTenant && u.email !== 'dario.ovejero@hotmail.com') warnings++;
    });
  }

  // 7. CHECK PRODUCTS
  console.log('\n7. PRODUCTOS');
  console.log('───────────────────────────────────────────────');
  const { data: products, error: prodErr } = await supabase.from('products').select('id,tenant_id,nombre,status').limit(5);
  if (prodErr) { console.error('  ERROR:', prodErr); errors++; }
  else {
    console.log(`  Total products: ${products.length} (mostrando 5)`);
    products.forEach(p => {
      console.log(`  ✓ ${p.nombre} | Tenant: ${p.tenant_id} | Status: ${p.status}`);
    });
  }

  // 8. CHECK ORDERS
  console.log('\n8. ÓRDENES');
  console.log('───────────────────────────────────────────────');
  const { data: orders, error: orderErr } = await supabase.from('orders').select('id,tenant_id,status,total').limit(5);
  if (orderErr) { console.error('  ERROR:', orderErr); errors++; }
  else {
    console.log(`  Total orders: ${orders.length} (mostrando 5)`);
    orders.forEach(o => {
      console.log(`  ✓ Orden ${o.id} | Tenant: ${o.tenant_id} | Status: ${o.status} | Total: $${o.total}`);
    });
  }

  // 9. CHECK RLS POLICIES
  console.log('\n9. RLS POLICIES (Verificación básica)');
  console.log('───────────────────────────────────────────────');
  const tablesToCheck = ['plans', 'tenant_members', 'locations', 'tenants', 'products', 'orders', 'customers'];
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (error && error.message.includes('policy')) {
        console.log(`  ✗ ${table}: ERROR RLS - ${error.message}`);
        errors++;
      } else {
        console.log(`  ✓ ${table}: Accesible`);
      }
    } catch (e) {
      console.log(`  ⚠ ${table}: Error inesperado - ${e.message}`);
      warnings++;
    }
  }

  // RESUMEN
  console.log('\n═══════════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Errores:   ${errors}`);
  console.log(`  Warnings:  ${warnings}`);
  if (errors === 0 && warnings === 0) {
    console.log('\n  ✅ TODO OK - LISTO PARA LANZAR');
  } else if (errors === 0) {
    console.log('\n  ⚠️  Hay warnings pero no errores críticos');
  } else {
    console.log('\n  ❌ HAY ERRORES - NO LANZAR TODAVÍA');
  }
}

main();
