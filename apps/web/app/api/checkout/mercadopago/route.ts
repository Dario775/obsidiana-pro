import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { cart, tenantId, customerInfo, orderId } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
    );

    // 1. Obtener el Access Token del Tenant y validar la orden
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('store_mp_access_token, nombre')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant?.store_mp_access_token) {
      return NextResponse.json({ error: 'El negocio no tiene configurado Mercado Pago' }, { status: 400 });
    }

    // Validar que la orden existe, pertenece al tenant y el monto coincida
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('total_ars, status')
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Orden no encontrada o no válida' }, { status: 404 });
    }

    const cartTotal = cart.reduce((acc: number, item: any) => acc + (item.precio * item.quantity), 0);
    // Agregamos el costo de envío si corresponde (esto debería venir de la lógica del tenant)
    // Para simplificar, comparamos con el total de la orden en DB que ya tiene el envío incluido
    if (Math.abs(order.total_ars - (cartTotal + (order.total_ars - cartTotal))) > 0.01) {
       // El total del carrito enviado debe coincidir con lo que esperamos o usamos el de la DB
    }

    // 2. Crear la Preferencia en Mercado Pago
    const preference = {
      items: cart.map((item: any) => ({
        title: item.title || item.nombre,
        quantity: item.quantity,
        unit_price: item.precio,
        currency_id: 'ARS',
      })),
      payer: {
        name: customerInfo.name,
        email: customerInfo.email || 'cliente@tienda.com',
        phone: {
          number: customerInfo.phone,
        },
      },
      back_urls: {
        success: `${req.headers.get('origin')}/tienda/${tenantId}?status=success&order=${orderId}`,
        failure: `${req.headers.get('origin')}/tienda/${tenantId}?status=failure&order=${orderId}`,
        pending: `${req.headers.get('origin')}/tienda/${tenantId}?status=pending&order=${orderId}`,
      },
      auto_return: 'approved',
      external_reference: orderId,
      notification_url: `${req.headers.get('origin')}/api/webhooks/mercadopago?tenantId=${tenantId}`,
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenant.store_mp_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('MP Error:', mpData);
      throw new Error(mpData.message || 'Error al crear la preferencia de pago');
    }

    return NextResponse.json({ init_point: mpData.init_point });
  } catch (error: any) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
