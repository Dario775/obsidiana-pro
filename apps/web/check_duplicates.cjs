const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Inspecting all customers with email dary775@gmail.com:');
  const { data, error } = await supabase
    .from('customers')
    .select('id, tenant_id, nombre, email, created_at')
    .eq('email', 'dary775@gmail.com');
  console.log(data);
}

run().catch(console.error);
