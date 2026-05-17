import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, scrapedData, tenantId, importUrl, editingItem } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    if (action === 'update') {
      if (!editingItem) {
        return NextResponse.json({ error: 'Editing item is required for update' }, { status: 400 });
      }

      // 1. Update Product
      const { error: pError } = await supabaseAdmin
        .from('products')
        .update({
          nombre: scrapedData.title,
          description: scrapedData.description,
          images: scrapedData.images || []
        })
        .eq('id', editingItem.product.id)
        .eq('tenant_id', tenantId);

      if (pError) throw pError;

      // 2. Update Variant
      const { error: vError } = await supabaseAdmin
        .from('product_variants')
        .update({
          price_ars: scrapedData.price || 0
        })
        .eq('id', editingItem.variant.id);

      if (vError) throw vError;

      return NextResponse.json({ success: true });
    } else if (action === 'insert') {
      const slug = (scrapedData.title || 'producto-ml').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      
      // Affiliate URL logic
      const affiliateId = "74040993"; // Or from tenant if possible
      let mlUrl = importUrl;
      try {
        const itemMatch = importUrl.match(/(?:MLA-?|mercadolibre\.com\.ar\/p\/[A-Za-z0-9]+|item\/MLA)[0-9]+/);
        if (itemMatch) {
          const itemId = itemMatch[0].replace(/[-/a-zA-Z]+/, 'MLA');
          mlUrl = `https://www.mercadolibre.com.ar/p/${itemId}?pdp_filters=deal:28751538-1#polycard_client=homes-korriban&affiliate_id=${affiliateId}`;
        }
      } catch (e) {}

      // 1. Create Product
      const { data: product, error: pError } = await supabaseAdmin
        .from('products')
        .insert({
          tenant_id: tenantId,
          nombre: scrapedData.title,
          description: scrapedData.description,
          slug: `${slug}-${Date.now()}`,
          status: 'active',
          available_online: true,
          is_published: true,
          seo: { ml_url: mlUrl },
          images: scrapedData.images || []
        })
        .select()
        .single();

      if (pError) throw pError;

      // 2. Create Variant
      const { data: variant, error: vError } = await supabaseAdmin
        .from('product_variants')
        .insert({
          product_id: product.id,
          sku: `ML-${Date.now().toString().slice(-6)}`,
          price_ars: scrapedData.price || 0
        })
        .select()
        .single();

      if (vError) throw vError;

      // 3. Create Inventory
      const { error: iError } = await supabaseAdmin
        .from('inventory_levels')
        .insert({
          tenant_id: tenantId,
          variant_id: variant.id,
          on_hand: 999
        });

      if (iError) throw iError;

      return NextResponse.json({ success: true, product });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('API /ml/import Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
