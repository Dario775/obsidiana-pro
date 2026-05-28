import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function DELETE(request: Request) {
  try {
    // 1. Authenticate the calling user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: CookieOptions) { cookieStore.delete({ name, ...options }); },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // 2. Get tenant_id from user metadata
    const tenantId = user.user_metadata?.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: 'No se encontró un negocio asociado a tu cuenta' }, { status: 400 });
    }

    // 3. Verify the user is the owner of this tenant
    const { data: membership } = await supabaseAdmin
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Solo el propietario puede eliminar la cuenta del negocio' }, { status: 403 });
    }

    // 4. Verify the tenant is not a platform admin (safety check)
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('is_platform_admin')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenantData?.is_platform_admin) {
      return NextResponse.json({ error: 'No se puede eliminar una cuenta de administrador de plataforma' }, { status: 403 });
    }

    // 5. Get all members of this tenant (to delete their auth accounts)
    const { data: members } = await supabaseAdmin
      .from('tenant_members')
      .select('user_id')
      .eq('tenant_id', tenantId);

    const memberUserIds = (members || []).map(m => m.user_id);

    // 6. Delete the tenant — CASCADE will remove:
    //    customers, products, product_variants, inventory_levels, orders, order_items,
    //    payments, stock_movements, stock_reservations, subscription_payments, suppliers,
    //    tenant_members, ml_products, ml_clicks_log, product_global_refs,
    //    product_attributes, product_attribute_options, product_attribute_assignments,
    //    cash_sessions, customer_segments, loyalty_settings, loyalty_balances, loyalty_transactions
    //
    //    NOTE: Cloudinary images are NOT deleted because they may be shared via global_catalog.
    //    Orphaned images can be cleaned manually from Cloudinary dashboard if needed.
    const { error: deleteError } = await supabaseAdmin
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (deleteError) {
      console.error('Error deleting tenant:', deleteError);
      return NextResponse.json({ error: 'Error al eliminar el negocio: ' + deleteError.message }, { status: 500 });
    }

    // 7. Delete all auth users that belonged to this tenant
    //    We check each user doesn't belong to another tenant before deleting
    const deleteResults: { userId: string; success: boolean; error?: string }[] = [];

    for (const userId of memberUserIds) {
      try {
        // Check if the user belongs to any OTHER tenant (edge case: shared users)
        const { data: otherMemberships } = await supabaseAdmin
          .from('tenant_members')
          .select('tenant_id')
          .eq('user_id', userId)
          .limit(1);

        if (otherMemberships && otherMemberships.length > 0) {
          // User still belongs to another tenant, don't delete auth account
          // Just clear the tenant_id from their metadata
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { tenant_id: null, store_name: null },
          });
          deleteResults.push({ userId, success: true, error: 'Preserved (belongs to another tenant)' });
          continue;
        }

        // Safe to delete auth user
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authDeleteError) {
          console.error(`Error deleting auth user ${userId}:`, authDeleteError);
          deleteResults.push({ userId, success: false, error: authDeleteError.message });
        } else {
          deleteResults.push({ userId, success: true });
        }
      } catch (err: any) {
        console.error(`Unexpected error deleting user ${userId}:`, err);
        deleteResults.push({ userId, success: false, error: err.message });
      }
    }

    // 8. Sign out the current user's session (cookies will be cleared client-side)
    try {
      await supabase.auth.signOut();
    } catch {
      // Non-critical: user will be redirected to login anyway
    }

    return NextResponse.json({
      success: true,
      message: 'Tu cuenta y todos los datos asociados fueron eliminados permanentemente.',
      details: {
        tenantDeleted: true,
        usersProcessed: deleteResults.length,
        usersDeleted: deleteResults.filter(r => r.success && !r.error?.includes('Preserved')).length,
        usersPreserved: deleteResults.filter(r => r.error?.includes('Preserved')).length,
        cloudinaryImages: 'preserved (shared catalog)',
      },
    });

  } catch (err: any) {
    console.error('Account deletion error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
