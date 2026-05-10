import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ml/auth
 * Server-side OAuth token exchange with Mercado Libre.
 * Keeps client_secret secure on the server — never sent to the browser.
 * 
 * Body: { code: string, tenant_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, tenant_id, code_verifier } = body;

    if (!code || !tenant_id) {
      return NextResponse.json(
        { error: 'Missing required fields: code, tenant_id' },
        { status: 400 }
      );
    }

    // 1. Load ML app config (client_id, client_secret, redirect_uri)
    const { data: configData, error: configError } = await supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('key', 'ml_app_config')
      .single();

    if (configError || !configData?.value) {
      return NextResponse.json(
        { error: 'ML app configuration not found. Contact platform admin.' },
        { status: 500 }
      );
    }

    const config = configData.value as {
      app_client_id: string;
      app_client_secret: string;
      app_redirect_uri: string;
    };

    if (!config.app_client_id || !config.app_client_secret || !config.app_redirect_uri) {
      return NextResponse.json(
        { error: 'Incomplete ML app configuration. Contact platform admin.' },
        { status: 500 }
      );
    }

    // 2. Verify tenant exists
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, nombre')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenantData) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // 3. Exchange authorization code for tokens (server-side — secret stays here)
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.app_client_id,
        client_secret: config.app_client_secret,
        code: code,
        redirect_uri: config.app_redirect_uri,
        ...(code_verifier ? { code_verifier } : {})
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('ML token exchange failed:', tokenResponse.status, errorBody);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code. The code may have expired.' },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    // 4. Fetch user profile to get the site_id (essential for search)
    let siteId = 'MLA'; // Default
    try {
      const userRes = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        siteId = userData.site_id || 'MLA';
      }
    } catch (e) {
      console.error('Failed to fetch ML user profile:', e);
    }

    // 5. Save tokens and site_id to tenant (server-side with service_role)
    const { error: updateError } = await supabaseAdmin
      .from('tenants')
      .update({
        ml_access_token: tokenData.access_token,
        ml_refresh_token: tokenData.refresh_token,
        ml_token_expires_at: new Date(
          Date.now() + tokenData.expires_in * 1000
        ).toISOString(),
        ml_user_id: tokenData.user_id ? String(tokenData.user_id) : null,
        ml_site_id: siteId,
      })
      .eq('id', tenant_id);

    if (updateError) {
      console.error('Failed to save ML tokens:', updateError);
      return NextResponse.json(
        { error: 'Tokens obtained but failed to save. Try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connected: true,
      tenant_name: tenantData.nombre,
    });

  } catch (error) {
    console.error('ML auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
