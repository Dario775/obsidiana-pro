const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'apps', 'web', 'app', 'api', 'register', 'route.ts');
let content = fs.readFileSync(file, 'utf8');

const regex = /const supabaseAdmin = createClient\([\s\S]*?\);/;
const replaceWith = "import { supabaseAdmin } from '@/lib/supabase-server';";

if (regex.test(content)) {
  content = content.replace(regex, replaceWith);
  fs.writeFileSync(file, content);
  console.log('Fixed api/register/route.ts via regex');
} else {
  console.log('Regex did not match.');
}
