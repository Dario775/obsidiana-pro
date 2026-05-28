import { NextResponse } from 'next/server';

/**
 * GET /api/auth/mercadopago/connect?tenantId=<id>
 *
 * Inicia el flujo de conexión OAuth de Mercado Pago para un tenant.
 * Redirecciona al usuario a Mercado Pago para autorizar la aplicación.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Falta el parámetro tenantId' }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_MP_APP_ID;
    if (!appId) {
      console.error('[MP OAuth] NEXT_PUBLIC_MP_APP_ID no está configurado en las variables de entorno');
      return NextResponse.json(
        { error: 'La plataforma no tiene configurado el Client ID de Mercado Pago' },
        { status: 500 }
      );
    }

    // Determinar la URL base dinámica para desarrollo y producción
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    const redirectUri = `${siteUrl}/api/auth/mercadopago/callback`;

    // URL oficial de autorización de Mercado Pago OAuth
    // Pasamos el tenantId en el parámetro 'state' para recuperarlo al volver
    const authUrl = `https://auth.mercadopago.com/authorization?client_id=${appId}&response_type=code&platform_id=mp&state=${tenantId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;

    console.log(`[MP OAuth] Redirigiendo a Mercado Pago para tenant: ${tenantId}`);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('[MP OAuth Connect Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
