import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@repo/shared';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tenant_id, ml_item_id, source_url } = body;

  if (!tenant_id || !ml_item_id) {
    return NextResponse.json({ success: true });
  }

  supabase
    .from('ml_clicks_log')
    .insert({ tenant_id, ml_item_id, source_url: source_url || null })
    .then();

  supabase.rpc('increment_ml_clicks', {
    p_item_id: ml_item_id,
    p_tenant_id: tenant_id,
  }).then();

  return NextResponse.json({ success: true });
}