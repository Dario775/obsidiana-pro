import { createClient } from '@supabase/supabase-js';

// Hardcoding URLs to bypass Vercel env var misconfigurations
const supabaseUrl = 'https://fjgwenrebdwssquebfay.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZ3dlbnJlYmR3c3NxdWViZmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNjE2MjUsImV4cCI6MjA5MzkzNzYyNX0.OjOnD3hxP33T56baAmHtvKeQlvXsmO9F1QbGs6GHGzM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export type SupabaseClient = typeof supabase;
