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

import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, storeName, googleUserId } = body;

    // For Google users: they already have an auth account, just need a tenant
    const isGoogleUser = !!googleUserId;

    // Validate input
    if (!storeName) {
      return NextResponse.json(
        { error: 'El nombre del negocio es obligatorio' },
        { status: 400 }
      );
    }

    if (!isGoogleUser && (!email || !password)) {
      return NextResponse.json(
        { error: 'Email y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    if (!isGoogleUser && password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Generate slug and check uniqueness
    let slug = storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingTenant) {
      // Add random suffix to make it unique
      slug = slug + '-' + Date.now().toString(36);
    }

    // 1. Create tenant first
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert([{
        nombre: storeName,
        slug,
        status: 'active',
        online_store_enabled: true,
        plan_id: 'free',
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

    // 2. Handle user creation / association
    if (isGoogleUser) {
      // Google user already exists in Auth — just create tenant_members association
      await supabaseAdmin
        .from('tenant_members')
        .insert({
          tenant_id: tenantData.id,
          user_id: googleUserId,
          role: 'owner',
        });

      // Update user metadata with tenant_id
      await supabaseAdmin.auth.admin.updateUserById(googleUserId, {
        user_metadata: {
          store_name: storeName,
          tenant_id: tenantData.id,
        },
      });

    } else {
      // Traditional email/password registration
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
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
    }

    // 3. Create default location for this tenant
    await supabaseAdmin
      .from('locations')
      .insert({
        tenant_id: tenantData.id,
        name: 'Local Principal',
        is_default: true,
      })
      .select()
      .maybeSingle(); // Ignore if exists

    return NextResponse.json({
      success: true,
      tenantId: tenantData.id,
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
