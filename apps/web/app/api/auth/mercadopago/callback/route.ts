import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * GET /api/auth/mercadopago/callback
 *
 * Callback de redirección de Mercado Pago OAuth.
 * Intercambia el código de autorización temporal ('code') por un token de acceso permanente,
 * actualiza el tenant en Supabase y redirige al panel de administración.
 */
export async function GET(req: Request) {
  let tenantId: string | null = null;
  
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    tenantId = searchParams.get('state'); // El 'state' tiene el tenantId enviado en la conexión

    // Determinar la URL base dinámica para redirecciones de retorno
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    const redirectBackUrl = `${siteUrl}/settings/store`;

    if (!code || !tenantId) {
      console.error('[MP OAuth Callback] Faltan parámetros requeridos:', { code: !!code, state: tenantId });
      return NextResponse.redirect(`${redirectBackUrl}?mp_error=missing_params`);
    }

    const appId = process.env.NEXT_PUBLIC_MP_APP_ID;
    const clientSecret = process.env.MP_CLIENT_SECRET;

    if (!appId || !clientSecret) {
      console.error('[MP OAuth Callback] NEXT_PUBLIC_MP_APP_ID o MP_CLIENT_SECRET no configurados en variables de entorno');
      return NextResponse.redirect(`${redirectBackUrl}?mp_error=platform_credentials_missing`);
    }

    const redirectUri = `${siteUrl}/api/auth/mercadopago/callback`;

    console.log(`[MP OAuth Callback] Intercambiando código de autorización para tenant: ${tenantId}`);

    // Intercambiar el código por tokens en Mercado Pago
    const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_secret: clientSecret,
        client_id: appId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.json();
      console.error('[MP OAuth Callback] Error de intercambio de tokens en Mercado Pago:', errorData);
      return NextResponse.redirect(`${redirectBackUrl}?mp_error=token_exchange_failed`);
    }

    const oauthData = await tokenRes.json();
    const { access_token, public_key, refresh_token, user_id } = oauthData;

    if (!access_token || !public_key) {
      console.error('[MP OAuth Callback] Respuesta de tokens de Mercado Pago incompleta:', oauthData);
      return NextResponse.redirect(`${redirectBackUrl}?mp_error=incomplete_response`);
    }

    // Inicializar cliente Supabase con privilegios administrativos para actualizar credenciales
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
    );

    // Actualizar el tenant con las credenciales de OAuth de Mercado Pago
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        store_mp_access_token: access_token,
        store_mp_public_key: public_key,
        store_mp_refresh_token: refresh_token || null,
        store_mp_user_id: user_id ? String(user_id) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (updateError) {
      console.error('[MP OAuth Callback] Error al actualizar las credenciales en base de datos:', updateError);
      return NextResponse.redirect(`${redirectBackUrl}?mp_error=database_update_failed`);
    }

    console.log(`[MP OAuth Callback] Conexión de Mercado Pago completada exitosamente para tenant: ${tenantId}`);
    return NextResponse.redirect(`${redirectBackUrl}?mp_connected=true`);
  } catch (error: any) {
    console.error('[MP OAuth Callback Exception]:', error);
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    return NextResponse.redirect(`${siteUrl}/settings/store?mp_error=server_error`);
  }
}
