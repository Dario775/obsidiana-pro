const fs = require('fs');
const path = require('path');

// 1. Update ml-affiliate page
const affiliatePath = path.join(process.cwd(), 'apps', 'web', 'app', '(admin)', 'settings', 'ml-affiliate', 'page.tsx');
let affiliateContent = fs.readFileSync(affiliatePath, 'utf8');

const oldConnectFunc = /async function connectWithML\(\) \{[\s\S]*?window\.location\.href = authUrl;\s*\}/;
const newConnectFunc = `async function connectWithML() {
    if (!platformConfig?.app_client_id || !platformConfig?.app_redirect_uri) {
      alert('Configuración de ML no disponible. Contacta al administrador.');
      return;
    }

    if (!tenant?.id) {
      alert('Error: ID de tienda no encontrado');
      return;
    }

    // PKCE Implementation required by Mercado Libre
    const generateRandomString = (length) => {
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      let result = '';
      const values = new Uint8Array(length);
      window.crypto.getRandomValues(values);
      for (let i = 0; i < length; i++) {
        result += charset[values[i] % charset.length];
      }
      return result;
    };

    const verifier = generateRandomString(128);
    localStorage.setItem('ml_code_verifier', verifier);

    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashString = String.fromCharCode.apply(null, hashArray);
    const base64Hash = btoa(hashString);
    const challenge = base64Hash.replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');

    const redirectUri = platformConfig.app_redirect_uri;
    const authUrl = \`https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=\${platformConfig.app_client_id}&redirect_uri=\${encodeURIComponent(redirectUri)}&state=\${tenant.id}&code_challenge=\${challenge}&code_challenge_method=S256\`;
    
    window.location.href = authUrl;
  }`;

if (oldConnectFunc.test(affiliateContent)) {
  affiliateContent = affiliateContent.replace(oldConnectFunc, newConnectFunc);
  fs.writeFileSync(affiliatePath, affiliateContent);
  console.log('Fixed ml-affiliate');
} else {
  console.log('Could not find connectWithML function');
}

// 2. Update callback page
const callbackPath = path.join(process.cwd(), 'apps', 'web', 'app', 'auth', 'mercadolibre', 'callback', 'page.tsx');
let callbackContent = fs.readFileSync(callbackPath, 'utf8');

callbackContent = callbackContent.replace(
  "body: JSON.stringify({ code, tenant_id: tenantId }),",
  "body: JSON.stringify({ code, tenant_id: tenantId, code_verifier: localStorage.getItem('ml_code_verifier') || '' }),"
);
fs.writeFileSync(callbackPath, callbackContent);
console.log('Fixed callback page');

// 3. Update auth API route
const apiPath = path.join(process.cwd(), 'apps', 'web', 'app', 'api', 'ml', 'auth', 'route.ts');
let apiContent = fs.readFileSync(apiPath, 'utf8');

apiContent = apiContent.replace(
  "const { code, tenant_id } = body;",
  "const { code, tenant_id, code_verifier } = body;"
);

const oldFetch = /body: new URLSearchParams\(\{\s*grant_type: 'authorization_code',\s*client_id: config\.app_client_id,\s*client_secret: config\.app_client_secret,\s*code: code,\s*redirect_uri: config\.app_redirect_uri,\s*\}\),/;
const newFetch = `body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.app_client_id,
        client_secret: config.app_client_secret,
        code: code,
        redirect_uri: config.app_redirect_uri,
        ...(code_verifier ? { code_verifier } : {})
      }),`;

apiContent = apiContent.replace(oldFetch, newFetch);
fs.writeFileSync(apiPath, apiContent);
console.log('Fixed auth API route');
