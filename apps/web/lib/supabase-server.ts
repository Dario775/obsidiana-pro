import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client with service_role key.
 * ONLY use in API Routes and Server Components — NEVER in 'use client' files.
 * This client bypasses RLS for admin operations.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceRoleKey) {
  console.warn(
    '⚠️ SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key for server operations. ' +
    'Set SUPABASE_SERVICE_ROLE_KEY in .env.local for proper server-side access.'
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
