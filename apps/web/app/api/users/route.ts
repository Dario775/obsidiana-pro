import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Helper to get authenticated user and their tenant_id
async function getAuthContext() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { user: null, tenantId: null, hasAccess: false, error: 'Unauthorized' };
  }

  // Get tenant ID from user metadata or tenant_members
  let tenantId = user.user_metadata?.tenant_id;
  if (!tenantId) {
    const { data: memberData } = await supabaseAdmin
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    
    if (memberData) {
      tenantId = memberData.tenant_id;
    }
  }

  if (!tenantId) {
    return { user, tenantId: null, hasAccess: false, error: 'No tenant assigned' };
  }

  // Verify that the user is owner to perform user management
  const { data: memberRole } = await supabaseAdmin
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  // If the user has a tenant_id in metadata but no tenant_members record, they are the owner/creator.
  const role = memberRole ? memberRole.role : 'owner';
  const hasAccess = role === 'owner';

  return { user, tenantId, hasAccess, error: null };
}

export async function GET(request: NextRequest) {
  try {
    const { tenantId, hasAccess, error } = await getAuthContext();
    if (error) return NextResponse.json({ error }, { status: 401 });
    if (!hasAccess) return NextResponse.json({ error: 'Prohibido: Solo el propietario del negocio puede gestionar usuarios y permisos' }, { status: 403 });

    // 1. Get all members in the tenant
    const { data: members, error: membersError } = await supabaseAdmin
      .from('tenant_members')
      .select('user_id, role, permissions, created_at')
      .eq('tenant_id', tenantId);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json({ error: 'Error al consultar miembros del negocio' }, { status: 500 });
    }

    const memberMap = new Map(members.map(m => [m.user_id, { role: m.role, permissions: m.permissions, created_at: m.created_at }]));

    // 2. Fetch users details via Auth Admin API
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing auth users:', listError);
      return NextResponse.json({ error: 'Error al listar usuarios de autenticación' }, { status: 500 });
    }

    // Filter and map users belonging to the tenant (either via tenant_members or metadata)
    const usersList = users
      .filter(u => u.user_metadata?.tenant_id === tenantId)
      .map(u => {
        const memberInfo = memberMap.get(u.id);
        const role = memberInfo?.role || 'owner';
        return {
          id: u.id,
          email: u.email,
          name: u.user_metadata?.name || u.user_metadata?.full_name || 'Usuario',
          role: role,
          permissions: memberInfo?.permissions || u.user_metadata?.permissions || {
            sales_invoice: true,
            sales_cancel: role === 'owner',
            sales_discount: role === 'owner',
            cash_open: true,
            cash_drawer: role === 'owner',
            cash_close: true,
          },
          created_at: memberInfo?.created_at || u.created_at,
        };
      });

    return NextResponse.json({ users: usersList });

  } catch (err: any) {
    console.error('Users GET route error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limiting: 10 usuarios creados por IP por hora ───────────────────
    const ip = getClientIp(request);
    const { allowed, retryAfter } = checkRateLimit(`users:${ip}`, 10, 3_600_000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Límite de creación de usuarios alcanzado. Esperá antes de agregar más.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const { user, tenantId, hasAccess, error } = await getAuthContext();
    if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
    if (!hasAccess) return NextResponse.json({ error: 'Prohibido' }, { status: 403 });

    const body = await request.json();
    const { email, password, name, role, permissions } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Nombre, email y contraseña son obligatorios' }, { status: 400 });
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    // Count existing sub-users (excluding owners)
    const { data: members, error: countError } = await supabaseAdmin
      .from('tenant_members')
      .select('user_id, role')
      .eq('tenant_id', tenantId);

    if (countError) {
      console.error('Error counting members:', countError);
      return NextResponse.json({ error: 'Error de validación del límite de usuarios' }, { status: 500 });
    }

    // Fetch dynamic max_users from tenant's current plan
    const { data: tenantPlan, error: tenantPlanError } = await supabaseAdmin
      .from('tenants')
      .select('plan_id, plans(max_users)')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenantPlanError) {
      console.error('Error fetching tenant plan:', tenantPlanError);
      return NextResponse.json({ error: 'Error al verificar plan y límites' }, { status: 500 });
    }

    const maxUsers = (tenantPlan?.plans as any)?.max_users ?? 5;

    // Filter created sub-users (roles other than owner)
    const subUsers = members.filter(m => m.role !== 'owner');
    if (subUsers.length >= maxUsers) {
      return NextResponse.json(
        { error: `Límite alcanzado: El plan actual permite crear hasta ${maxUsers} usuarios adicionales. Para crear más, actualizá tu suscripción.` },
        { status: 400 }
      );
    }

    // Default permissions if none provided
    const defaultPermissions = {
      sales_invoice: true,
      sales_cancel: false,
      sales_discount: false,
      cash_open: true,
      cash_drawer: false,
      cash_close: true,
      ...(permissions || {})
    };

    // Create user in Auth
    const { data: createdAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        tenant_id: tenantId,
        permissions: defaultPermissions
      }
    });

    if (createError) {
      console.error('Error creating user in Auth:', createError);
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Insert into tenant_members with permissions and added_by tracking
    const { error: memberInsertError } = await supabaseAdmin
      .from('tenant_members')
      .insert({
        tenant_id: tenantId,
        user_id: createdAuthUser.user.id,
        role: role || 'member',
        permissions: defaultPermissions,
        added_by: user.id
      });

    if (memberInsertError) {
      console.error('Error linking user to tenant:', memberInsertError);
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUser.user.id);
      return NextResponse.json({ error: 'Error al vincular el usuario al negocio' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: createdAuthUser.user.id,
        email: createdAuthUser.user.email,
        name,
        role: role || 'member',
        permissions: defaultPermissions,
        created_at: new Date().toISOString(),
      }
    });

  } catch (err: any) {
    console.error('Users POST route error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, tenantId, hasAccess, error } = await getAuthContext();
    if (error || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
    if (!hasAccess) return NextResponse.json({ error: 'Prohibido' }, { status: 403 });

    const body = await request.json();
    const { userId, name, role, permissions } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario es obligatorio' }, { status: 400 });
    }

    // Verify user belongs to this tenant via auth metadata
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError || !authUser || !authUser.user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (authUser.user.user_metadata?.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'El usuario no pertenece a este negocio' }, { status: 403 });
    }

    // Get current role
    const { data: existingMember } = await supabaseAdmin
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .maybeSingle();

    const currentRole = existingMember?.role || 'owner';

    // Update user metadata in auth
    const { data: updatedAuthUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        name,
        permissions
      }
    });

    if (updateError) {
      console.error('Error updating user auth metadata:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Update role and permissions in tenant_members if user is not the owner
    if (currentRole !== 'owner') {
      if (existingMember) {
        // Update existing member record
        const { error: memberUpdateError } = await supabaseAdmin
          .from('tenant_members')
          .update({ 
            ...(role ? { role } : {}),
            ...(permissions ? { permissions } : {})
          })
          .eq('tenant_id', tenantId)
          .eq('user_id', userId);

        if (memberUpdateError) {
          console.error('Error updating member details:', memberUpdateError);
          return NextResponse.json({ error: 'Error al actualizar el usuario en la base de datos' }, { status: 500 });
        }
      } else {
        // Insert member record (in case it was missing)
        const { error: memberInsertError } = await supabaseAdmin
          .from('tenant_members')
          .insert({
            tenant_id: tenantId,
            user_id: userId,
            role: role || 'member',
            permissions: permissions || {},
            added_by: user.id
          });

        if (memberInsertError) {
          console.error('Error inserting member details:', memberInsertError);
          return NextResponse.json({ error: 'Error al registrar el usuario en la base de datos' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedAuthUser.user.id,
        email: updatedAuthUser.user.email,
        name,
        role: currentRole === 'owner' ? 'owner' : (role || currentRole),
        permissions,
        created_at: updatedAuthUser.user.created_at,
      }
    });

  } catch (err: any) {
    console.error('Users PUT route error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId, hasAccess, error } = await getAuthContext();
    if (error) return NextResponse.json({ error }, { status: 401 });
    if (!hasAccess) return NextResponse.json({ error: 'Prohibido' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario es obligatorio' }, { status: 400 });
    }

    // Verify user belongs to this tenant via auth metadata
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError || !authUser || !authUser.user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (authUser.user.user_metadata?.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'El usuario no pertenece a este negocio' }, { status: 403 });
    }

    // Get current role
    const { data: existingMember } = await supabaseAdmin
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .maybeSingle();

    const currentRole = existingMember?.role || 'owner';

    if (currentRole === 'owner') {
      return NextResponse.json({ error: 'No es posible eliminar al propietario del negocio' }, { status: 400 });
    }

    // 1. Delete from tenant_members if a record exists
    if (existingMember) {
      const { error: memberDeleteError } = await supabaseAdmin
        .from('tenant_members')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      if (memberDeleteError) {
        console.error('Error deleting tenant member:', memberDeleteError);
        return NextResponse.json({ error: 'Error al desvincular el usuario de la base de datos' }, { status: 500 });
      }
    }

    // 2. Delete from Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error('Error deleting user from auth:', authDeleteError);
      return NextResponse.json({ error: 'Error al eliminar el usuario de la base de datos de autenticación' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Users DELETE route error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
