const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fjgwenrebdwssquebfay.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2MTYyNSwiZXhwIjoyMDkzOTM3NjI1fQ.g0LQrTqKkbpwiicea00pkl9374UizIhz46Y_Y1_fln4');

async function checkConfig() {
  const { data, error } = await supabase.from('platform_settings').select('value').eq('key', 'ml_app_config').single();
  if (error) console.error(error);
  else {
    console.log('Client ID: [' + data.value.app_client_id + ']');
    console.log('Client Secret: [' + data.value.app_client_secret + ']');
    console.log('Redirect URI: [' + data.value.app_redirect_uri + ']');
  }
}
checkConfig();
