import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * POST /api/platform/settings/payments/generate-link
 * 
 * Verifies that the given Mercado Pago Access Token is valid by calling
 * the MP Users/me endpoint. Does NOT create any payment preference.
 * Only accessible by the platform super admin.
 */
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

    // Strictly platform admin only
    if (user.email !== 'dary775@gmail.com') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { mp_client_secret } = await request.json();

    if (!mp_client_secret) {
      return NextResponse.json({ error: 'Falta el Access Token' }, { status: 400 });
    }

    // Call MP /users/me to verify the token — no preference is created
    const mpResponse = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${mp_client_secret}`,
      },
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      return NextResponse.json(
        { 
          valid: false,
          error: mpData.message || 'Token inválido o sin permisos',
          code: mpData.code,
        },
        { status: 200 } // Always 200 so the client can read the body
      );
    }

    // Token is valid — return safe info from MP account
    return NextResponse.json({
      valid: true,
      account: {
        id: mpData.id,
        email: mpData.email,
        nickname: mpData.nickname,
        site_id: mpData.site_id,
        country_id: mpData.country_id,
      },
    });

  } catch (error: any) {
    console.error('Error in verify-credentials API:', error);
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
}
