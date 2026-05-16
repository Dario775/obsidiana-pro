import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Usamos createBrowserClient para que se sincronice con las cookies del Middleware
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);

export type SupabaseClient = typeof supabase;
