import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('data.id') || searchParams.get('id');
    const type = searchParams.get('type') || searchParams.get('topic');

    if (type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const { data: configData } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'payment_config')
      .maybeSingle();

    const PLATFORM_MP_ACCESS_TOKEN = configData?.value?.mp_client_secret || process.env.MP_PLATFORM_ACCESS_TOKEN;

    // 1. Get payment details from Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: {
        'Authorization': `Bearer ${PLATFORM_MP_ACCESS_TOKEN}`,
      },
    });

    if (!mpResponse.ok) throw new Error('Error al obtener datos de MP');
    const payment = await mpResponse.json();

    if (payment.status === 'approved') {
      const { tenant_id, plan_id } = payment.metadata;

      if (!tenant_id || !plan_id) {
        console.error('Webhook missing metadata:', payment.metadata);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // 2. Register payment in DB
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
          mp_payment_id: String(id)
        });

      if (paymentError) throw paymentError;

      // 3. Update Tenant Subscription
      const now = new Date();
      const paidUntil = new Date(now);
      paidUntil.setMonth(paidUntil.getMonth() + 1);

      const { error: tenantError } = await supabaseAdmin
        .from('tenants')
        .update({
          plan_id,
          plan_started_at: now.toISOString(),
          paid_until: paidUntil.toISOString(),
          subscription_status: 'active'
        })
        .eq('id', tenant_id);

      if (tenantError) throw tenantError;

      console.log(`Subscription updated for tenant ${tenant_id} to plan ${plan_id}`);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Error in platform webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
