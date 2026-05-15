import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = cookies();
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
      // Check if user has a tenant
      const userTenantId = data.user.user_metadata?.tenant_id;
      
      if (!userTenantId) {
        // Double check in tenant_members table
        const { data: memberData } = await supabase
          .from('tenant_members')
          .select('tenant_id')
          .eq('user_id', data.user.id)
          .maybeSingle();
        
        if (!memberData) {
          // New user from Google without tenant -> redirect to registration/onboarding
          return NextResponse.redirect(`${origin}/register`);
        }
      }
      
      // If we are here, user has a tenant or is an admin
      // Check if is platform admin
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('is_platform_admin')
        .eq('id', userTenantId || '')
        .maybeSingle();
      
      if (tenantData?.is_platform_admin) {
        return NextResponse.redirect(`${origin}/overview`);
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
