import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@repo/shared';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { item_ids, tenant_id } = body;

    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return NextResponse.json({ error: 'Missing item_ids' }, { status: 400 });
    }

    const results: Record<string, { price: number; currency: string }> = {};

    const { data: tenantData } = await supabase
      .from('tenants')
      .select('ml_access_token')
      .eq('id', tenant_id)
      .single();

    const accessToken = tenantData?.ml_access_token;

    for (const itemId of item_ids.slice(0, 20)) {
      try {
        const response = await fetch(
          `https://api.mercadolibre.com/items/${itemId}`,
          {
            headers: accessToken
              ? { 'Authorization': `Bearer ${accessToken}` }
              : {},
          }
        );

        if (response.ok) {
          const data = await response.json();
          results[itemId] = {
            price: data.price,
            currency: data.currency_id,
          };
        } else {
          results[itemId] = { price: 0, currency: 'ARS' };
        }
      } catch (e) {
        results[itemId] = { price: 0, currency: 'ARS' };
      }
    }

    return NextResponse.json({ prices: results });
  } catch (error) {
    console.error('Prices fetch error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}