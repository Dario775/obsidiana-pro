import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Reverses the stock for a given order ID.
 * This should be called when an order is cancelled.
 */
export async function reverseOrderStock(orderId: string, tenantId: string) {
  try {
    // 1. Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) return { success: true, message: 'No items to reverse' };

    // 2. Increment stock for each item
    for (const item of items) {
      if (!item.variant_id) continue;

      // Try to use a stored procedure if available
      const { error: rpcError } = await supabase.rpc('increment_stock', {
        p_tenant_id: tenantId,
        p_variant_id: item.variant_id,
        p_quantity: item.quantity,
      });

      // Fallback to manual update if RPC fails
      if (rpcError) {
        console.warn('RPC increment_stock not found, falling back to manual update:', rpcError.message);
        
        // Get current inventory record
        const { data: invRecords, error: fetchError } = await supabase
          .from('inventory_levels')
          .select('id, on_hand')
          .eq('tenant_id', tenantId)
          .eq('variant_id', item.variant_id);

        if (fetchError) {
          console.error(`Error fetching inventory for variant ${item.variant_id}:`, fetchError);
          continue;
        }

        if (invRecords && invRecords.length > 0) {
          // Update the first inventory record (usually there's only one per variant/tenant if not multi-branch)
          const inv = invRecords[0];
          const { error: updateError } = await supabase
            .from('inventory_levels')
            .update({ on_hand: (inv.on_hand || 0) + item.quantity })
            .eq('id', inv.id);

          if (updateError) {
            console.error(`Error updating inventory for variant ${item.variant_id}:`, updateError);
          }
        }
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error reversing stock:', error);
    return { success: false, error: error.message };
  }
}
