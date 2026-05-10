import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ML_SITE_ID = 'MLA'; // Argentina

async function getTenantInfo(tenantId: string) {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('ml_access_token, ml_refresh_token, ml_token_expires_at')
    .eq('id', tenantId)
    .single();
  return tenant;
}

/**
 * Helper: ensures we have a valid ML token for the tenant.
 * Auto-refreshes if expired.
 */
async function getValidToken(tenantId: string): Promise<string | null> {
  const tenant = await getTenantInfo(tenantId);
  if (!tenant?.ml_access_token) return null;

  // Check if token is still valid (with 5 min buffer)
  const expiresAt = tenant.ml_token_expires_at
    ? new Date(tenant.ml_token_expires_at)
    : new Date(0);
  const now = new Date(Date.now() + 5 * 60 * 1000); // 5 min buffer

  if (expiresAt > now) {
    return tenant.ml_access_token;
  }

  // Token expired — try to refresh
  if (!tenant.ml_refresh_token) return null;

  const { data: configData } = await supabaseAdmin
    .from('platform_settings')
    .select('value')
    .eq('key', 'ml_app_config')
    .single();

  const config = configData?.value as {
    app_client_id: string;
    app_client_secret: string;
  } | null;

  if (!config?.app_client_id || !config?.app_client_secret) return null;

  try {
    const refreshResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.app_client_id,
        client_secret: config.app_client_secret,
        refresh_token: tenant.ml_refresh_token,
      }),
    });

    if (!refreshResponse.ok) {
      // Invalidate stored tokens
      await supabaseAdmin
        .from('tenants')
        .update({
          ml_access_token: null,
          ml_refresh_token: null,
          ml_token_expires_at: null,
        })
        .eq('id', tenantId);
      return null;
    }

    const tokenData = await refreshResponse.json();

    // Save new tokens
    await supabaseAdmin
      .from('tenants')
      .update({
        ml_access_token: tokenData.access_token,
        ml_refresh_token: tokenData.refresh_token,
        ml_token_expires_at: new Date(
          Date.now() + tokenData.expires_in * 1000
        ).toISOString(),
      })
      .eq('id', tenantId);

    return tokenData.access_token;
  } catch {
    return null;
  }
}

/**
 * POST /api/ml/search
 * Server-side product search on Mercado Libre.
 * Access token never leaves the server.
 * 
 * Body: { query: string, tenant_id: string, limit?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, tenant_id, limit = 20 } = body;

    if (!query || !tenant_id) {
      return NextResponse.json(
        { error: 'Missing required fields: query, tenant_id' },
        { status: 400 }
      );
    }

    // Diagnostic: Test if ML is even reachable
    try {
      const testRes = await fetch('https://api.mercadolibre.com/sites', {
        headers: { 'User-Agent': 'ObsidianaPro/1.0' }
      });
      console.log('ML Sites Reachability:', testRes.status);
    } catch (e) {
      console.error('ML not reachable at all:', e);
    }

    const tenant = await getTenantInfo(tenant_id);
    const accessToken = await getValidToken(tenant_id);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found in database.' },
        { status: 401 }
      );
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'ML not connected or token expired. Please reconnect.', needsReconnect: true },
        { status: 401 }
      );
    }

    // Fetch site_id on the fly from the token (ensures regional correctness)
    let siteId = ML_SITE_ID;
    try {
      const userRes = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'ObsidianaPro/1.0'
        }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        siteId = userData.site_id || ML_SITE_ID;
      }
    } catch (e) {
      console.error('Failed to fetch siteId on the fly:', e);
    }

    // Search ML API server-side
    const searchLimit = Math.min(Math.max(1, limit), 50);
    const searchUrl = `https://api.mercadolibre.com/sites/${siteId}/search?q=${encodeURIComponent(query)}&limit=${searchLimit}`;
    
    let searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'User-Agent': 'ObsidianaPro/1.0 (https://obsidiana-pro.vercel.app)'
      },
    });

    // Fallback to public search if authorized search is forbidden (common for some app types/categories)
    if (searchResponse.status === 403) {
      const forbiddenBody = await searchResponse.text();
      console.error('Authorized search 403 body:', forbiddenBody);
      
      console.log('Authorized search forbidden, trying public search...');
      searchResponse = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ObsidianaPro/1.0 (https://obsidiana-pro.vercel.app)'
        },
      });

      if (!searchResponse.ok) {
        const publicForbiddenBody = await searchResponse.text();
        console.error('Public search failure body:', publicForbiddenBody);
      }
    }

    if (!searchResponse.ok) {
      const status = searchResponse.status;
      const errorText = await searchResponse.text();
      let mlError = errorText;
      
      try {
        // Try to pretty-print if it's JSON
        mlError = JSON.stringify(JSON.parse(errorText));
      } catch {
        // Stay as plain text if not JSON
      }

      console.error(`ML API Error (${status}):`, mlError);

      if (status === 401) {
        return NextResponse.json(
          { error: 'ML session expired. Please reconnect.', needsReconnect: true, details: mlError },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: `ML API Error (${status})`, details: mlError },
        { status: status }
      );
    }

    const data = await searchResponse.json();

    // Map results — only return safe fields (no tokens)
    const results = (data.results || []).map((item: any) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency_id,
      thumbnail: item.thumbnail,
      pictures: item.pictures?.map((p: any) => p.url) || [],
      condition: item.condition,
      listing_type_id: item.listing_type_id,
      category_id: item.category_id,
      permalink: item.permalink,
    }));

    return NextResponse.json({
      results,
      total: data.paging?.total || 0,
    });

  } catch (error: any) {
    console.error('ML search error:', error);
    return NextResponse.json(
      { error: 'Internal server error [v3]', details: error.message || String(error) },
      { status: 500 }
    );
  }
}
