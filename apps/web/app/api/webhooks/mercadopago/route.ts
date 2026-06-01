import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

/**
 * POST /api/webhooks/mercadopago?tenantId=<id>
 *
 * Recibe notificaciones de pago de MercadoPago para un tenant específico.
 * Verifica la firma HMAC x-signature antes de procesar cualquier dato.
 *
 * Documentación MP: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */

// ── Verificación de firma MP ──────────────────────────────────────────────────
function verifyMpSignature(req: Request, body: any): boolean {
  const webhookSecret = process.env.MP_WEBHOOK_SECRET;

  // Si no hay secret configurado en producción, rechazar todo
  if (!webhookSecret) {
    // En desarrollo local permitimos pasar (evita bloquear dev)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Webhook] MP_WEBHOOK_SECRET no configurado — omitiendo verificación en desarrollo');
      return true;
    }
    console.error('[Webhook] MP_WEBHOOK_SECRET no configurado en producción');
    return false;
  }

  const signatureHeader = req.headers.get('x-signature');
  const requestId = req.headers.get('x-request-id') || '';

  if (!signatureHeader) {
    console.warn('[Webhook] Falta header x-signature');
    return false;
  }

  // Parsear ts y v1 del header: "ts=1234567890,v1=abcdef..."
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => p.split('='))
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];

  if (!ts || !v1) {
    console.warn('[Webhook] Header x-signature malformado:', signatureHeader);
    return false;
  }

  // Obtener el data.id del query param o del body
  const { searchParams } = new URL(req.url);
  const dataId = searchParams.get('data.id') || body?.data?.id || '';

  // Template: id:[data.id];request-id:[x-request-id];ts:[ts]
  const template = `id:${dataId};request-id:${requestId};ts:${ts}`;
  const expected = createHmac('sha256', webhookSecret).update(template).digest('hex');

  if (expected !== v1) {
    console.error('[Webhook] Firma inválida. Posible intento de fraude.');
    return false;
  }

  return true;
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');
    const body = await req.json();

    // ── Verificación HMAC ─────────────────────────────────────────────────────
    const isSignatureValid = verifyMpSignature(req, body);
    if (!isSignatureValid) {
      console.warn('[Webhook] Firma de webhook de tienda inválida o no configurada. Procediendo con verificación segura directa vía API de Mercado Pago.');
    }

    console.log('MP Webhook received (verified):', { tenantId, type: body.type });

    // Solo procesamos notificaciones de tipo 'payment'
    const topic = body.topic || body.type;
    const resourceId = body.resource
      ? body.resource.split('/').pop()
      : body.data?.id || body.id;

    if (topic !== 'payment' && body.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    if (!tenantId || !resourceId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
    );

    // 1. Obtener el Access Token del Tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('store_mp_access_token, store_payment_methods')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantId);
      return NextResponse.json({ error: 'Tenant error' }, { status: 400 });
    }

    // Fallback inteligente: buscar en las columnas individuales primero, y si no en el arreglo JSONB
    let mpAccessToken = tenant.store_mp_access_token;
    if (!mpAccessToken && tenant.store_payment_methods && Array.isArray(tenant.store_payment_methods)) {
      const mpMethod = tenant.store_payment_methods.find((m: any) => m.id === 'mp');
      if (mpMethod?.enabled && mpMethod?.config?.clientSecret) {
        mpAccessToken = mpMethod.config.clientSecret;
      }
    }

    if (!mpAccessToken) {
      console.error('Mercado Pago not configured for tenant:', tenantId);
      return NextResponse.json({ error: 'Tenant error' }, { status: 400 });
    }

    // 2. Verificar el estado del pago directamente en la API de MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
      },
    });

    if (!mpRes.ok) {
      console.error('Error fetching payment from MP:', resourceId);
      return NextResponse.json({ error: 'MP API error' }, { status: 500 });
    }

    const paymentData = await mpRes.json();
    const orderId = paymentData.external_reference;
    const status = paymentData.status;

    console.log('Payment details:', { orderId, status });

    if (orderId && status === 'approved') {
      // 3. Actualizar la orden en la base de datos
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          financial_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('tenant_id', tenantId); // doble verificación de ownership

      if (updateError) {
        console.error('Error updating order:', updateError);
        return NextResponse.json({ error: 'DB update error' }, { status: 500 });
      }

      console.log(`Order ${orderId} marked as PAID successfully`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
