import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';

export async function GET() {
  try {
    const { data: d2, error: e2 } = await supabaseAdmin.from('products').select('*').limit(1);
    const { data: d3, error: e3 } = await supabaseAdmin.from('product_variants').select('*').limit(1);
    const { data: d4, error: e4 } = await supabaseAdmin.from('inventory_levels').select('*').limit(1);

    return NextResponse.json({
      products: d2 ? Object.keys(d2[0] || {}) : e2,
      variants: d3 ? Object.keys(d3[0] || {}) : e3,
      inventory: d4 ? Object.keys(d4[0] || {}) : e4,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
