const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fjgwenrebdwssquebfay.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZ3dlbnJlYmR3c3NxdWViZmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2MTYyNSwiZXhwIjoyMDkzOTM3NjI1fQ.g0LQrTqKkbpwiicea00pkl9374UizIhz46Y_Y1_fln4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log('Querying platform_config...');
    const { data: config, error: configError } = await supabase
      .from('platform_config')
      .select('*')
      .eq('key', 'payment_config')
      .maybeSingle();

    if (configError) throw configError;

    console.log('payment_config found:', JSON.stringify(config, null, 2));

    console.log('\nQuerying plans...');
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*');

    if (plansError) throw plansError;

    console.log('Plans found count:', plans ? plans.length : 0);
    if (plans) {
      plans.forEach(p => {
        console.log(`- Plan ${p.name || p.nombre} (ID: ${p.id}): Price $${p.monthly_price || p.precio_mensual || 0}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
