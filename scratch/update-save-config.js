const fs = require('fs');
const path = require('path');

const affiliatePath = path.join(process.cwd(), 'apps', 'web', 'app', '(admin)', 'settings', 'ml-affiliate', 'page.tsx');
let content = fs.readFileSync(affiliatePath, 'utf8');

// Replace saveConfig function
const oldSaveFunc = /async function saveConfig\(\) \{[\s\S]*?alert\('Configuración guardada'\);\s*\}/;
const newSaveFunc = `async function saveConfig() {
    if (!tenant?.id) return;
    setSaving(true);

    try {
      const response = await fetch('/api/ml/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          ml_affiliate_id: form.ml_affiliate_id,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      alert('Configuración guardada');
    } catch (error) {
      console.error('Save error:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  }`;

content = content.replace(oldSaveFunc, newSaveFunc);
fs.writeFileSync(affiliatePath, content);
console.log('Updated saveConfig to use API route');
