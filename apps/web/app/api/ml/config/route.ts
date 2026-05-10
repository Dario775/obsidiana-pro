import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: configData, error: configError } = await supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('key', 'ml_app_config')
      .single();

    if (configError || !configData?.value) {
      return NextResponse.json(
        { error: 'ML app configuration not found' },
        { status: 404 }
      );
    }

    const config = configData.value as any;

    // NEVER return the client_secret
    return NextResponse.json({
      app_client_id: config.app_client_id,
      app_redirect_uri: config.app_redirect_uri,
    });
  } catch (error) {
    console.error('Error fetching ML config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
