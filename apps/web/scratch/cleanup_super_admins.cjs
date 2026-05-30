const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const allowedAdminEmail = 'dary775@gmail.com';

async function run() {
  console.log('--- FETCHING ALL USERS ---');
  const { data: usersData, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) {
    console.error(uErr);
    return;
  }

  for (const user of usersData.users) {
    if (user.email === allowedAdminEmail) {
      console.log(`Setting strict is_platform_admin = true for ${user.email}...`);
      const newMetadata = {
        ...user.user_metadata,
        is_platform_admin: true
      };
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: newMetadata
      });
      continue;
    }

    if (user.user_metadata && user.user_metadata.is_platform_admin) {
      console.log(`Removing super admin permissions from ${user.email}...`);
      const newMetadata = { ...user.user_metadata };
      delete newMetadata.is_platform_admin;

      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: newMetadata
      });

      if (error) {
        console.error(`Failed to remove permission from ${user.email}:`, error);
      } else {
        console.log(`Successfully removed is_platform_admin from ${user.email}`);
      }
    }
  }
}

run().catch(console.error);
