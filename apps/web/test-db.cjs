require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: d2, error: e2 } = await supabase.from('products').select('*').limit(1);
  if (e2) console.error('Products error:', e2);
  console.log('Products columns:', d2 ? Object.keys(d2[0] || {}) : []);

  const { data: d3, error: e3 } = await supabase.from('product_variants').select('*').limit(1);
  if (e3) console.error('Variants error:', e3);
  console.log('Variants columns:', d3 ? Object.keys(d3[0] || {}) : []);

  const { data: d4, error: e4 } = await supabase.from('inventory_levels').select('*').limit(1);
  if (e4) console.error('Inventory error:', e4);
  console.log('Inventory columns:', d4 ? Object.keys(d4[0] || {}) : []);
}

test().catch(console.error);
