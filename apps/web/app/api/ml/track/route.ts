import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ml/track
 * Logs an affiliate click for a ML product.
 * Uses service_role client for reliable DB writes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, ml_item_id, source_url } = body;

    if (!tenant_id || !ml_item_id) {
      return NextResponse.json(
        { error: 'Missing tenant_id or ml_item_id' },
        { status: 400 }
      );
    }

    // Insert click log
    const { error: logError } = await supabaseAdmin
      .from('ml_clicks_log')
      .insert({
        tenant_id,
        ml_item_id,
        source_url: source_url || null,
      });

    if (logError) {
      console.error('Click log insert error:', logError);
    }

    // Increment counter on ml_products
    const { error: rpcError } = await supabaseAdmin.rpc('increment_ml_clicks', {
      p_item_id: ml_item_id,
      p_tenant_id: tenant_id,
    });

    if (rpcError) {
      console.error('Click increment error:', rpcError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Track error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}