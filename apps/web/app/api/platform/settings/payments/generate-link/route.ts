import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { cookieStore.delete({ name, ...options }); },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verify it is strictly the platform admin
    if (user.email !== 'dary775@gmail.com') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { amount, mp_client_secret } = await request.json();

    if (!amount || !mp_client_secret) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const reqUrl = new URL(request.url);
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || reqUrl.origin || 'https://www.obsidiana.com.ar';

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mp_client_secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{
          title: 'Suscripción Obsidiana',
          quantity: 1,
          currency_id: 'ARS',
          unit_price: amount,
        }],
        back_urls: {
          success: `${origin}/platform/subscriptions?payment=success`,
          failure: `${origin}/platform/subscriptions?payment=failed`,
        },
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
    console.error('Error in generate-link API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
