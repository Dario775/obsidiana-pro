import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, ml_affiliate_id } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ ml_affiliate_id })
      .eq('id', tenant_id);

    if (error) {
      console.error('Error saving ML config:', error);
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
