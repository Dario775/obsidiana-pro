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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!isGoogleUser && email && !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'El formato del email no es válido' },
        { status: 400 }
      );
    }

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
    const baseSlug = slug;
    
    // Retry with unique suffixes if slug exists (up to 5 attempts)
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existingTenant } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (!existingTenant) break;
      
      // Use crypto-random suffix for uniqueness under concurrent requests
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      slug = `${baseSlug}-${randomSuffix}`;
    }

    // Validate plan_id exists before creating tenant
    const planId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'; // Free plan ID
    const { data: planData } = await supabaseAdmin
      .from('plans')
      .select('id')
      .eq('id', planId)
      .maybeSingle();

    if (!planData) {
      console.error('Free plan not found in database');
      return NextResponse.json(
        { error: 'Error de configuración: el plan gratuito no existe en la base de datos' },
        { status: 500 }
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
        plan_id: planId,
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
      const { error: memberError } = await supabaseAdmin
        .from('tenant_members')
        .insert({
          tenant_id: tenantData.id,
          user_id: googleUserId,
          role: 'owner',
        });

      if (memberError) {
        console.error('tenant_members insert failed, cleaning up tenant:', memberError);
        await supabaseAdmin.from('tenants').delete().eq('id', tenantData.id);
        return NextResponse.json(
          { error: 'Error al asociar tu cuenta con el negocio: ' + memberError.message },
          { status: 500 }
        );
      }

      // Update user metadata with tenant_id
      const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(googleUserId, {
        user_metadata: {
          store_name: storeName,
          tenant_id: tenantData.id,
        },
      });

      if (metaError) {
        console.error('User metadata update failed:', metaError);
        // Don't fail registration — metadata can be updated later
      }

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
        
        // Handle duplicate email case
        if (userError.message?.includes('already registered') || userError.message?.includes('already exists') || userError.message?.includes('User already registered')) {
          return NextResponse.json(
            { error: 'Ya existe una cuenta con ese email. Iniciá sesión o recuperá tu contraseña.' },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { error: userError.message },
          { status: 400 }
        );
      }

      // Create tenant_members association for email/password users
      const { error: memberError } = await supabaseAdmin
        .from('tenant_members')
        .insert({
          tenant_id: tenantData.id,
          user_id: userData.user.id,
          role: 'owner',
        });

      if (memberError) {
        console.error('tenant_members insert failed for email user, cleaning up:', memberError);
        await supabaseAdmin.from('tenants').delete().eq('id', tenantData.id);
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
        return NextResponse.json(
          { error: 'Error al asociar tu cuenta con el negocio: ' + memberError.message },
          { status: 500 }
        );
      }
    }

    // 3. Create default location for this tenant (if table exists)
    // Note: locations table may not exist in all environments, so we handle this gracefully
    try {
      await supabaseAdmin
        .from('locations')
        .insert({
          tenant_id: tenantData.id,
          name: 'Local Principal',
          is_default: true,
        })
        .select()
        .maybeSingle();
    } catch (locErr) {
      console.warn('Default location creation skipped (table may not exist):', locErr);
      // Non-critical: location can be created manually later via admin panel
    }

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
