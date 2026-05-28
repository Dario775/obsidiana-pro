import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
);

export async function GET() {
  try {
    const { data: configData, error } = await supabaseAdmin
      .from('platform_config')
      .select('value')
      .eq('key', 'payment_config')
      .maybeSingle();

    if (error || !configData) {
      return NextResponse.json({
        transfer_enabled: false,
        mp_enabled: false
      });
    }

    const val = configData.value || {};

    // Sanitize and return ONLY safe public fields to protect platform credentials
    return NextResponse.json({
      transfer_enabled: val.transfer_enabled ?? false,
      transfer_bank: val.transfer_bank || '',
      transfer_cbu: val.transfer_cbu || '',
      transfer_alias: val.transfer_alias || '',
      mp_enabled: val.mp_enabled ?? false
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
