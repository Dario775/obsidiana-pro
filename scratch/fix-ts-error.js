const fs = require('fs');
const path = require('path');

const affiliatePath = path.join(process.cwd(), 'apps', 'web', 'app', '(admin)', 'settings', 'ml-affiliate', 'page.tsx');
let affiliateContent = fs.readFileSync(affiliatePath, 'utf8');

affiliateContent = affiliateContent.replace(
  "const generateRandomString = (length) => {",
  "const generateRandomString = (length: number) => {"
);

fs.writeFileSync(affiliatePath, affiliateContent);
console.log('Fixed TypeScript type for generateRandomString');
