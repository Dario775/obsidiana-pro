const fs = require('fs');
const path = require('path');

const affiliatePath = path.join(process.cwd(), 'apps', 'web', 'app', '(admin)', 'settings', 'ml-affiliate', 'page.tsx');
let affiliateContent = fs.readFileSync(affiliatePath, 'utf8');

// Replace the problematic line with a more TS-friendly one
affiliateContent = affiliateContent.replace(
  "result += charset[values[i] % charset.length];",
  "const index = (values[i] ?? 0) % charset.length;\n        result += charset[index];"
);

fs.writeFileSync(affiliatePath, affiliateContent);
console.log('Fixed more TypeScript errors for generateRandomString');
