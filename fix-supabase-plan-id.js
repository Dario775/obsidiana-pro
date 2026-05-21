const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjgwenrebdwssquebfay.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZ3dlbnJlYmR3c3NxdWViZmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2MTYyNSwiZXhwIjoyMDkzOTM3NjI1fQ.g0LQrTqKkbpwiicea00pkl9374UizIhz46Y_Y1_fln4';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('=== DIAGNÓSTICO ===');
  
  // 1. Ver todos los planes
  const { data: plans, error: plansErr } = await supabase.from('plans').select('id, name, nombre');
  if (plansErr) { console.error('Error plans:', plansErr); return; }
  console.log('\nPlans existentes:', JSON.stringify(plans, null, 2));
  
  // 2. Ver todos los tenants
  const { data: tenants, error: tenantsErr } = await supabase.from('tenants').select('id, nombre, plan_id');
  if (tenantsErr) { console.error('Error tenants:', tenantsErr); return; }
  console.log('\nTenants existentes:', JSON.stringify(tenants, null, 2));

  // Mapeo de IDs de texto a UUIDs
  const textToUuidMap = {
    'free': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'inicio': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'pro': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'premium': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
  };

  // 3. Actualizar tenants que usan IDs de texto
  console.log('\n=== ACTUALIZANDO TENANTS ===');
  for (const tenant of tenants) {
    if (textToUuidMap[tenant.plan_id]) {
      const newPlanId = textToUuidMap[tenant.plan_id];
      console.log(`Tenant "${tenant.nombre}": plan_id '${tenant.plan_id}' -> '${newPlanId}'`);
      const { error } = await supabase
        .from('tenants')
        .update({ plan_id: newPlanId })
        .eq('id', tenant.id);
      if (error) console.error(`  Error:`, error);
      else console.log(`  OK`);
    }
  }

  // 4. Eliminar planes duplicados con IDs de texto
  console.log('\n=== ELIMINANDO PLANES DUPLICADOS ===');
  const textIds = Object.keys(textToUuidMap);
  for (const textId of textIds) {
    console.log(`Eliminando plan '${textId}'...`);
    const { error } = await supabase.from('plans').delete().eq('id', textId);
    if (error) console.error(`  Error:`, error);
    else console.log(`  OK`);
  }

  // 5. Verificar estado final
  console.log('\n=== ESTADO FINAL ===');
  const { data: finalPlans } = await supabase.from('plans').select('id, name, nombre');
  console.log('Plans finales:', JSON.stringify(finalPlans, null, 2));
  
  const { data: finalTenants } = await supabase.from('tenants').select('id, nombre, plan_id');
  console.log('Tenants finales:', JSON.stringify(finalTenants, null, 2));

  console.log('\n=== AHORA EJECUTAR EN SQL EDITOR ===');
  console.log(`
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_plan_id_fkey;
ALTER TABLE tenants ALTER COLUMN plan_id DROP DEFAULT;
ALTER TABLE plans ALTER COLUMN id DROP DEFAULT;
ALTER TABLE plans ALTER COLUMN id TYPE uuid USING id::uuid;
ALTER TABLE tenants ALTER COLUMN plan_id TYPE uuid USING plan_id::uuid;
ALTER TABLE plans ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE tenants ALTER COLUMN plan_id SET DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid;
ALTER TABLE tenants ADD CONSTRAINT tenants_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL;
  `);
}

main();
