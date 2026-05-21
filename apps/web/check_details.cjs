const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const customerId = '4b44ee92-4373-4f23-b6a5-26b7af2431ae';
  
  console.log(`Checking customer ${customerId}:`);
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, tenant_id, nombre, email')
    .eq('id', customerId)
    .single();

  if (customerError) {
    console.error('Error customer:', customerError);
    return;
  }
  console.log(customer);

  console.log(`\nChecking orders for customer ${customerId}:`);
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, tenant_id, number, total_ars, financial_status, placed_at')
    .eq('customer_id', customerId);

  if (ordersError) {
    console.error('Error orders:', ordersError);
    return;
  }
  console.log(orders);
}

run().catch(console.error);
