import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');
    const body = await req.json();

    console.log('MP Webhook received:', { tenantId, body });

    // Mercado Pago envía notificaciones de diferentes tipos. 
    // Nos interesan las de tipo 'payment' o las que tienen 'resource' que termina en un ID de pago.
    const topic = body.topic || body.type;
    const resourceId = body.resource ? body.resource.split('/').pop() : (body.data?.id || body.id);

    if (topic !== 'payment' && body.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    if (!tenantId || !resourceId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Obtener el Access Token del Tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('store_mp_access_token')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant?.store_mp_access_token) {
      console.error('Tenant not found or no token:', tenantId);
      return NextResponse.json({ error: 'Tenant error' }, { status: 400 });
    }

    // 2. Consultar el estado del pago en Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
      headers: {
        'Authorization': `Bearer ${tenant.store_mp_access_token}`
      }
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
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('tenant_id', tenantId);

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
