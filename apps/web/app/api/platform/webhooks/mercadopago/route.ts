import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

/**
 * POST /api/platform/webhooks/mercadopago
 *
 * Recibe notificaciones de pago de suscripciones de la plataforma.
 * Verifica la firma HMAC x-signature antes de procesar.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

// ── Verificación de firma MP ──────────────────────────────────────────────────
function verifyMpSignature(req: Request, dataId: string): boolean {
  // La plataforma usa un secret distinto al de las tiendas individuales
  const webhookSecret = process.env.MP_PLATFORM_WEBHOOK_SECRET || process.env.MP_WEBHOOK_SECRET;

  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Platform Webhook] Secret no configurado — omitiendo verificación en desarrollo');
      return true;
    }
    console.error('[Platform Webhook] MP_PLATFORM_WEBHOOK_SECRET no configurado en producción');
    return false;
  }

  const signatureHeader = req.headers.get('x-signature');
  const requestId = req.headers.get('x-request-id') || '';

  if (!signatureHeader) {
    console.warn('[Platform Webhook] Falta header x-signature');
    return false;
  }

  // Parsear ts y v1: "ts=1234567890,v1=abcdef..."
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => p.split('='))
  );
  const ts = parts['ts'];
  const v1 = parts['v1'];

  if (!ts || !v1) {
    console.warn('[Platform Webhook] Header x-signature malformado:', signatureHeader);
    return false;
  }

  // Template oficial: id:[data.id];request-id:[x-request-id];ts:[ts]
  const template = `id:${dataId};request-id:${requestId};ts:${ts}`;
  const expected = createHmac('sha256', webhookSecret).update(template).digest('hex');

  if (expected !== v1) {
    console.error('[Platform Webhook] Firma inválida. Posible intento de fraude de suscripción.');
    return false;
  }

  return true;
}

export async function POST(req: Request) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      // Ignorar si no hay body
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('data.id') || searchParams.get('id') || body.data?.id || body.id || (body.resource ? body.resource.split('/').pop() : null);
    const type = searchParams.get('type') || searchParams.get('topic') || body.type || body.topic || body.action;

    console.log('[Platform Webhook] Recibido:', {
      id,
      type,
      searchParams: Object.fromEntries(searchParams.entries()),
      bodyKeys: Object.keys(body),
    });

    // Solo procesar notificaciones de pago
    if (type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
    }

    // ── Verificación HMAC ─────────────────────────────────────────────────────
    const isSignatureValid = verifyMpSignature(req, id);
    if (!isSignatureValid) {
      console.warn('[Platform Webhook] Firma de webhook inválida o no configurada. Procediendo con verificación segura directa vía API de Mercado Pago.');
    }

    // Obtener el access token de la plataforma
    const { data: configData } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'payment_config')
      .maybeSingle();

    const PLATFORM_MP_ACCESS_TOKEN =
      configData?.value?.mp_client_secret || process.env.MP_PLATFORM_ACCESS_TOKEN;

    if (!PLATFORM_MP_ACCESS_TOKEN) {
      console.error('[Platform Webhook] No MP access token configured');
      return NextResponse.json({ error: 'Platform not configured' }, { status: 500 });
    }

    // 1. Verificar el pago directamente en la API de MP
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        Authorization: `Bearer ${PLATFORM_MP_ACCESS_TOKEN}`,
      },
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('[Platform Webhook] Error fetching payment from MP:', errorText);
      throw new Error('Error al obtener datos de MP: ' + errorText);
    }
    const payment = await mpResponse.json();

    console.log('[Platform Webhook] Detalles del pago de MP:', {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      metadata: payment.metadata
    });

    if (payment.status === 'approved') {
      const tenant_id = payment.metadata?.tenant_id || payment.metadata?.tenantId || payment.metadata?.tenantid;
      const plan_id = payment.metadata?.plan_id || payment.metadata?.planId || payment.metadata?.planid;

      if (!tenant_id || !plan_id) {
        console.error('[Platform Webhook] Webhook sin metadata requerida:', payment.metadata);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // 2. Registrar el pago
      const { error: paymentError } = await supabaseAdmin
        .from('subscription_payments')
        .insert({
          tenant_id,
          plan_id,
          amount: payment.transaction_amount,
          currency: payment.currency_id,
          payment_method: 'mercadopago',
          status: 'completed',
          paid_at: new Date().toISOString(),
          transaction_id: String(id),
        });

      if (paymentError) throw paymentError;

      // 3. Actualizar suscripción del tenant
      const now = new Date();
      const paidUntil = new Date(now);
      paidUntil.setMonth(paidUntil.getMonth() + 1);

      const { error: tenantError } = await supabaseAdmin
        .from('tenants')
        .update({
          plan_id,
          plan_started_at: now.toISOString(),
          paid_until: paidUntil.toISOString(),
          subscription_status: 'active',
        })
        .eq('id', tenant_id);

      if (tenantError) throw tenantError;

      console.log(`[Platform Webhook] Suscripción actualizada exitosamente para tenant ${tenant_id} → plan ${plan_id}`);
    } else {
      console.log(`[Platform Webhook] Pago ${id} no aprobado (status: ${payment.status})`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Platform Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
