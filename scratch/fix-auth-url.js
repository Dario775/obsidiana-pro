const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'apps', 'web', 'app', '(platform)', 'settings', 'ml', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

// The file currently has: const authUrl = https://auth.mercadolibre.com.ar...
// We need to fix it to use backticks.

content = content.replace(
  'const authUrl = https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${form.app_client_id}&redirect_uri=${encodeURIComponent(form.app_redirect_uri)}&state=${tenantId};',
  'const authUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${form.app_client_id}&redirect_uri=${encodeURIComponent(form.app_redirect_uri)}&state=${tenantId}`;'
);

fs.writeFileSync(file, content);
console.log('Fixed authUrl successfully.');
