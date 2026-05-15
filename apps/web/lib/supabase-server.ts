import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client with service_role key.
 * ONLY use in API Routes and Server Components — NEVER in 'use client' files.
 * This client bypasses RLS for admin operations.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
