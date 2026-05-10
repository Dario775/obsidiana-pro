const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'apps', 'web', 'app', '(platform)', 'settings', 'ml', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /function generateTenantAuthUrl\(tenantId: string\) \{[\s\S]*?return authUrl;\s*\}/;

const replaceWith = `function generateTenantAuthUrl(tenantId: string) {
    if (!form.app_client_id || !form.app_redirect_uri) {
      alert('Configura el Client ID y Redirect URI primero');
      return '';
    }

    const authUrl = \`https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=\${form.app_client_id}&redirect_uri=\${encodeURIComponent(form.app_redirect_uri)}&state=\${tenantId}\`;
    return authUrl;
  }`;

if (regex.test(content)) {
  content = content.replace(regex, replaceWith);
  fs.writeFileSync(file, content);
  console.log('Function replaced successfully.');
} else {
  console.log('Regex did not match.');
}
