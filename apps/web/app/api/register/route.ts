import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/register
 * 
 * Server-side registration:
 * 1. Validates input
 * 2. Creates tenant with supabaseAdmin (bypasses RLS)
 * 3. Creates user via Auth admin API with tenant_id in metadata
 * 4. If user creation fails, cleans up the tenant reliably
 * 
 * This prevents orphan tenants since the admin client can always clean up.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, storeName } = body;

    // Validate input
    if (!email || !password || !storeName) {
      return NextResponse.json(
        { error: 'Email, contraseña y nombre del negocio son obligatorios' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Generate slug and check uniqueness
    const slug = storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Ya existe un negocio con ese nombre. Elegí otro.' },
        { status: 409 }
      );
    }

    // 1. Create tenant first
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert([{
        nombre: storeName,
        slug,
        status: 'active',
        online_store_enabled: true,
      }])
      .select('id')
      .single();

    if (tenantError || !tenantData) {
      console.error('Error creating tenant:', tenantError);
      return NextResponse.json(
        { error: 'Error al crear el negocio: ' + (tenantError?.message || 'desconocido') },
        { status: 500 }
      );
    }

    // 2. Create user via Admin Auth API
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for now
      user_metadata: {
        store_name: storeName,
        tenant_id: tenantData.id,
      },
    });

    if (userError) {
      // CLEANUP: Delete the tenant since user creation failed
      console.error('User creation failed, cleaning up tenant:', userError);
      await supabaseAdmin.from('tenants').delete().eq('id', tenantData.id);
      
      return NextResponse.json(
        { error: userError.message },
        { status: 400 }
      );
    }

    // 3. Create default location for this tenant
    await supabaseAdmin
      .from('locations')
      .insert({
        id: '00000000-0000-0000-0000-000000000001',
        tenant_id: tenantData.id,
        name: 'Local Principal',
        is_default: true,
      })
      .select()
      .maybeSingle(); // Ignore if exists

    return NextResponse.json({
      success: true,
      tenantId: tenantData.id,
      userId: userData.user?.id,
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
