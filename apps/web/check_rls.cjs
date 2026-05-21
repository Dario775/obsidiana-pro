const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Inspecting table properties from pg_tables...');
  const { data, error } = await supabase.rpc('get_table_rls_status');
  
  if (error) {
    // If RPC doesn't exist, we run a query to check
    console.log('RPC get_table_rls_status not found, running query...');
    const { data: queryData, error: queryError } = await supabase
      .from('orders')
      .select('id')
      .limit(1);
    console.log('Query orders check:', { dataCount: queryData?.length, error: queryError });
  } else {
    console.log(data);
  }
}

run().catch(console.error);
