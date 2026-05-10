const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'apps', 'web', 'app', 'api', 'register', 'route.ts');
let content = fs.readFileSync(file, 'utf8');

const regex = /process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!,/g;
const replaceWith = `process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',`;

if (regex.test(content)) {
  content = content.replace(regex, replaceWith);
  fs.writeFileSync(file, content);
  console.log('Fixed supabase init via regex');
} else {
  console.log('Regex did not match.');
}
