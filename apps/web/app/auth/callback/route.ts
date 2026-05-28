import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const state = searchParams.get('state'); // storeName from registration
  // Validate "next" parameter to prevent open redirect attacks
  let next = searchParams.get('next') ?? '/dashboard';
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    next = '/dashboard';
  }

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
    
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data.user) {
      // Password recovery flow — redirect to reset password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // Email confirmation flow
      if (type === 'signup') {
        return NextResponse.redirect(`${origin}/login?message=Email confirmado. Ingresá con tu contraseña.`);
      }

      // 1. Check for tenant association via user_metadata first
      const metadataTenantId = data.user.user_metadata?.tenant_id;
      
      if (metadataTenantId) {
        // Check tenant status and admin flag directly
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('is_platform_admin, status')
          .eq('id', metadataTenantId)
          .maybeSingle();
        
        if (tenantData) {
          if (tenantData.status !== 'active') {
            return NextResponse.redirect(`${origin}/login?error=Tu cuenta está suspendida. Contactá al soporte.`);
          }
          if (tenantData.is_platform_admin) {
            return NextResponse.redirect(`${origin}/overview`);
          }
          return NextResponse.redirect(`${origin}/dashboard`);
        }
      }

      // 2. Check tenant_members
      const { data: memberData } = await supabase
        .from('tenant_members')
        .select('tenant_id, tenants(is_platform_admin, status)')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      if (memberData) {
        const tenantStatus = (memberData.tenants as any)?.status;
        if (tenantStatus !== 'active') {
          return NextResponse.redirect(`${origin}/login?error=Tu cuenta está suspendida. Contactá al soporte.`);
        }
        const isPlatformAdmin = (memberData.tenants as any)?.is_platform_admin;
        if (isPlatformAdmin) {
          return NextResponse.redirect(`${origin}/overview`);
        }
        return NextResponse.redirect(`${origin}${next}`);
      }

      // 3. SUPER ADMIN DETECTION (DEFINITIVE — runs BEFORE auto-create)
      // This prevents the recurring bug where dary775@gmail.com gets a new store
      // created every time their metadata or tenant_members row is lost.
      const SUPER_ADMIN_EMAIL = 'dary775@gmail.com';
      const PLATFORM_TENANT_ID = process.env.NEXT_PUBLIC_PLATFORM_TENANT_ID || '51605ab9-958d-4e81-8360-8007fe842c85';

      if (data.user.email === SUPER_ADMIN_EMAIL) {
        // Ensure tenant_members association exists
        const { data: existingMember } = await supabaseAdmin
          .from('tenant_members')
          .select('id')
          .eq('tenant_id', PLATFORM_TENANT_ID)
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (!existingMember) {
          await supabaseAdmin.from('tenant_members').insert({
            tenant_id: PLATFORM_TENANT_ID,
            user_id: data.user.id,
            role: 'owner',
          });
        }

        // Always ensure user_metadata is correct
        await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
          user_metadata: {
            tenant_id: PLATFORM_TENANT_ID,
            is_platform_admin: true,
          },
        });

        return NextResponse.redirect(`${origin}/overview`);
      }

      // 4. New Google user — create tenant automatically
      const storeName = state ? decodeURIComponent(state) : (data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Mi Tienda');
      let slug = storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const baseSlug = slug;
      
      // Ensure unique slug
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: existing } = await supabaseAdmin.from('tenants').select('id').eq('slug', slug).maybeSingle();
        if (!existing) break;
        slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
      }

      const planId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';

      const { data: newTenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .insert([{ nombre: storeName, slug, status: 'active', online_store_enabled: true, plan_id: planId }])
        .select('id')
        .single();

      if (tenantError || !newTenant) {
        console.error('Callback: failed to create tenant for Google user:', tenantError);
        return NextResponse.redirect(`${origin}/login?error=No se pudo crear tu negocio. Contactá al soporte.`);
      }

      // Create tenant_members association
      const { error: memberError } = await supabaseAdmin
        .from('tenant_members')
        .insert({ tenant_id: newTenant.id, user_id: data.user.id, role: 'owner' });

      if (memberError) {
        console.error('Callback: failed to create tenant_members:', memberError);
        await supabaseAdmin.from('tenants').delete().eq('id', newTenant.id);
        return NextResponse.redirect(`${origin}/login?error=No se pudo completar tu registro. Contactá al soporte.`);
      }

      // Update user metadata
      await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
        user_metadata: { store_name: storeName, tenant_id: newTenant.id },
      });

      // Create default location
      try {
        await supabaseAdmin.from('locations').insert({ tenant_id: newTenant.id, name: 'Local Principal', is_default: true });
      } catch {
        // Non-critical
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Invalid session`);
}
