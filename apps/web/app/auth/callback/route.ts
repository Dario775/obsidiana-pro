import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // 1. Check for tenant association
      const { data: memberData } = await supabase
        .from('tenant_members')
        .select('tenant_id, tenants(is_platform_admin)')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      // 2. If no tenant association found, send to registration
      if (!memberData) {
        return NextResponse.redirect(`${origin}/register`);
      }

      // 3. Check if the tenant is a platform admin (Super Admin)
      const isPlatformAdmin = (memberData.tenants as any)?.is_platform_admin;

      if (isPlatformAdmin) {
        return NextResponse.redirect(`${origin}/overview`);
      }
      
      // 4. Default for regular merchants
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
