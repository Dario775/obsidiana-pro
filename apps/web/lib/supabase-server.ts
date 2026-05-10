import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client with service_role key.
 * ONLY use in API Routes and Server Components — NEVER in 'use client' files.
 * This client bypasses RLS for admin operations.
 */

// Hardcoding URLs to bypass Vercel env var misconfigurations
const supabaseUrl = 'https://fjgwenrebdwssquebfay.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZ3dlbnJlYmR3c3NxdWViZmF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2MTYyNSwiZXhwIjoyMDkzOTM3NjI1fQ.g0LQrTqKkbpwiicea00pkl9374UizIhz46Y_Y1_fln4';

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
