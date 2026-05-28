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

// ── Rate Limiter en memoria ───────────────────────────────────────────────────
// Máximo 5 registros por IP por hora (ventana deslizante).
// Nota: En entornos serverless con múltiples instancias este límite es por instancia.
// Para límites globales, considerar Upstash Redis o Vercel Rate Limiting.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hora

const registrationAttempts = new Map<string, number[]>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Limpiar entradas expiradas
  const attempts = (registrationAttempts.get(ip) || []).filter((t) => t > windowStart);

  if (attempts.length >= RATE_LIMIT_MAX) {
    registrationAttempts.set(ip, attempts);
    return true;
  }

  attempts.push(now);
  registrationAttempts.set(ip, attempts);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting ───────────────────────────────────────────────────────
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: 'Demasiados intentos de registro. Por favor espera un momento e intenta nuevamente.' },
        {
          status: 429,
          headers: {
            'Retry-After': '3600',
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
            'X-RateLimit-Window': '3600s',
          },
        }
      );
    }
    const body = await request.json();
    const { email, password, confirmPassword, storeName, googleUserId } = body;

    // DEFINITIVE: Block Super Admin email from creating a new store
    const SUPER_ADMIN_EMAIL = 'dary775@gmail.com';
    if (email === SUPER_ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Esta cuenta es de administración de plataforma y no puede crear tiendas.' },
        { status: 403 }
      );
    }

    // For Google users: they already have an auth account, just need a tenant
    const isGoogleUser = !!googleUserId;

    // Validate input
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const storeNameRegex = /^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ\s.,'\-&()]+$/;

    if (!storeName) {
      return NextResponse.json(
        { error: 'El nombre del negocio es obligatorio' },
        { status: 400 }
      );
    }

    if (storeName.length < 3 || storeName.length > 50) {
      return NextResponse.json(
        { error: 'El nombre del negocio debe tener entre 3 y 50 caracteres' },
        { status: 400 }
      );
    }

    if (!storeNameRegex.test(storeName)) {
      return NextResponse.json(
        { error: 'El nombre del negocio contiene caracteres no permitidos. Solo se permiten letras, números, espacios y signos básicos (.,\'-&()).' },
        { status: 400 }
      );
    }

    if (!isGoogleUser) {
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email y contraseña son obligatorios' },
          { status: 400 }
        );
      }

      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'El formato del email no es válido' },
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 8 caracteres' },
          { status: 400 }
        );
      }

      if (password !== confirmPassword) {
        return NextResponse.json(
          { error: 'Las contraseñas no coinciden' },
          { status: 400 }
        );
      }
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
      // We use the standard supabaseClient (non-admin) with signUp so that GoTrue sends the confirmation email.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

      const origin = request.nextUrl.origin;
      const { data: userData, error: userError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?type=signup`,
          data: {
            store_name: storeName,
            tenant_id: tenantData.id,
          },
        },
      });

      if (userError || !userData?.user) {
        // CLEANUP: Delete the tenant since user creation failed
        console.error('User creation failed, cleaning up tenant:', userError);
        await supabaseAdmin.from('tenants').delete().eq('id', tenantData.id);
        
        const errMsg = userError?.message || 'Error al registrar el usuario';
        
        // Handle duplicate email case
        if (errMsg.includes('already registered') || errMsg.includes('already exists') || errMsg.includes('User already registered')) {
          return NextResponse.json(
            { error: 'Ya existe una cuenta con ese email. Iniciá sesión o recuperá tu contraseña.' },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { error: errMsg },
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
