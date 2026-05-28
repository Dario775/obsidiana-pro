import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

export async function POST(req: Request) {
  try {
    const { planId, tenantId } = await req.json();

    if (!planId || !tenantId) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // 1. Get Plan data
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    // 2. Get Tenant data
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('nombre, email')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    // 3. Get Platform Credentials from DB
    const { data: configData } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'payment_config')
      .maybeSingle();

    const PLATFORM_MP_ACCESS_TOKEN = configData?.value?.mp_client_secret || process.env.MP_PLATFORM_ACCESS_TOKEN;

    if (!PLATFORM_MP_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Configuración de pago de plataforma no disponible' }, { status: 500 });
    }

    // Determine origin dynamically to support localhost, vercel deployments, and production domains
    const reqUrl = new URL(req.url);
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || reqUrl.origin || 'https://obsidiana.pro';

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PLATFORM_MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            id: plan.id,
            title: `Suscripción Obsidiana: ${plan.name || plan.nombre}`,
            quantity: 1,
            unit_price: plan.monthly_price || plan.precio_mensual,
            currency_id: 'ARS',
          },
        ],
        metadata: {
          tenant_id: tenantId,
          plan_id: planId,
          type: 'subscription_payment',
        },
        back_urls: {
          success: `${origin}/settings/billing?status=success`,
          failure: `${origin}/settings/billing?status=failure`,
          pending: `${origin}/settings/billing?status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${origin}/api/platform/webhooks/mercadopago`,
      }),
    });

    const preference = await response.json();

    if (!response.ok) {
      console.error('MercadoPago Preference Creation Error:', preference);
      return NextResponse.json({ error: preference.message || 'Error de MercadoPago al crear preferencia' }, { status: response.status });
    }

    return NextResponse.json({ 
      id: preference.id, 
      init_point: preference.init_point 
    });

  } catch (error: any) {
    console.error('Error in platform checkout:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
