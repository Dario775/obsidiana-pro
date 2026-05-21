const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('number, channel, customer_name')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }
  console.log('Orders sample:');
  console.table(orders.slice(0, 20));
}

run().catch(console.error);
