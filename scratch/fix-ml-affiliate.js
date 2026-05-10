const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'apps', 'web', 'app', '(admin)', 'settings', 'ml-affiliate', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /const loadPlatformConfig = async \(\) => \{[\s\S]*?\};/;
const replaceWith = `  const loadPlatformConfig = async () => {
    try {
      const response = await fetch('/api/ml/config');
      if (response.ok) {
        const data = await response.json();
        setPlatformConfig({
          app_client_id: data.app_client_id || '',
          app_redirect_uri: data.app_redirect_uri || '',
        });
      }
    } catch (error) {
      console.error('Error loading ML config:', error);
    }
  };`;

if (regex.test(content)) {
  content = content.replace(regex, replaceWith);
  fs.writeFileSync(file, content);
  console.log('Fixed loadPlatformConfig via regex');
} else {
  console.log('Regex did not match.');
}
