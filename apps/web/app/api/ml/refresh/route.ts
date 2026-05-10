import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ml/refresh
 * Server-side token refresh for Mercado Libre.
 * Keeps client_secret secure on the server.
 * 
 * Body: { tenant_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id } = body;

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'Missing tenant_id' },
        { status: 400 }
      );
    }

    // 1. Load ML app config
    const { data: configData } = await supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('key', 'ml_app_config')
      .single();

    const config = configData?.value as {
      app_client_id: string;
      app_client_secret: string;
    } | null;

    if (!config?.app_client_id || !config?.app_client_secret) {
      return NextResponse.json(
        { error: 'ML app not configured' },
        { status: 500 }
      );
    }

    // 2. Get current refresh token for tenant
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('ml_refresh_token')
      .eq('id', tenant_id)
      .single();

    if (!tenantData?.ml_refresh_token) {
      return NextResponse.json(
        { error: 'No refresh token available. Reconnect with ML.' },
        { status: 400 }
      );
    }

    // 3. Refresh token server-side
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.app_client_id,
        client_secret: config.app_client_secret,
        refresh_token: tenantData.ml_refresh_token,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('ML token refresh failed:', tokenResponse.status, errorBody);

      // If refresh token is invalid, clear tokens
      if (tokenResponse.status === 400 || tokenResponse.status === 401) {
        await supabaseAdmin
          .from('tenants')
          .update({
            ml_access_token: null,
            ml_refresh_token: null,
            ml_token_expires_at: null,
          })
          .eq('id', tenant_id);
      }

      return NextResponse.json(
        { error: 'Token refresh failed. You may need to reconnect.' },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    // 4. Save new tokens
    await supabaseAdmin
      .from('tenants')
      .update({
        ml_access_token: tokenData.access_token,
        ml_refresh_token: tokenData.refresh_token,
        ml_token_expires_at: new Date(
          Date.now() + tokenData.expires_in * 1000
        ).toISOString(),
      })
      .eq('id', tenant_id);

    return NextResponse.json({
      success: true,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    });

  } catch (error) {
    console.error('ML refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
