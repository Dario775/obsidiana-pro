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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('data.id') || searchParams.get('id');
    const type = searchParams.get('type') || searchParams.get('topic');

    // Solo procesar notificaciones de pago
    if (type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
    }

    // ── Verificación HMAC ─────────────────────────────────────────────────────
    if (!verifyMpSignature(req, id)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
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

    if (!mpResponse.ok) throw new Error('Error al obtener datos de MP');
    const payment = await mpResponse.json();

    if (payment.status === 'approved') {
      const { tenant_id, plan_id } = payment.metadata || {};

      if (!tenant_id || !plan_id) {
        console.error('[Platform Webhook] Webhook sin metadata:', payment.metadata);
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
          mp_payment_id: String(id),
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

      console.log(`[Platform Webhook] Suscripción actualizada para tenant ${tenant_id} → plan ${plan_id}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Platform Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
