const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'apps', 'web', 'app', '(platform)', 'settings', 'ml', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace('hasToken: boolean;\\n  phone: string | null;', 'hasToken: boolean;\n  phone: string | null;');

fs.writeFileSync(file, content);
console.log('Fixed literal backslash n');
