import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';

export async function GET() {
  try {
    const { data: tenants, error: te } = await supabaseAdmin.from('tenants').select('id, nombre, slug, store_domain');
    const { data: products, error: pe } = await supabaseAdmin.from('products').select('id, tenant_id, nombre, status, available_online');

    return NextResponse.json({
      tenants: tenants || te,
      products: products || pe,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
