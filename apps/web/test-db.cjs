require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log('Database diagnostic client initialized successfully.');
  
  const { data, error } = await supabase.from('product_attributes').select('id, name, slug').limit(1);
  if (error) {
    console.error('Attributes read error:', error);
  } else {
    console.log('Successfully read attributes:', data);
  }
}

test().catch(console.error);
