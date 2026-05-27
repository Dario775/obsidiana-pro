'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface UserPermissions {
  sales_invoice: boolean;
  sales_cancel: boolean;
  sales_discount: boolean;
  cash_open: boolean;
  cash_drawer: boolean;
  cash_close: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string;
  permissions: UserPermissions;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: 'owner',
  permissions: {
    sales_invoice: true,
    sales_cancel: true,
    sales_discount: true,
    cash_open: true,
    cash_drawer: true,
    cash_close: true,
  },
  isSuperAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>('owner');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>({
    sales_invoice: true,
    sales_cancel: true,
    sales_discount: true,
    cash_open: true,
    cash_drawer: true,
    cash_close: true,
  });
  const [loading, setLoading] = useState(true);

  const fetchRoleAndPermissions = async (currentUser: User | null) => {
    if (!currentUser) {
      setRole('member');
      setIsSuperAdmin(false);
      setPermissions({
        sales_invoice: false,
        sales_cancel: false,
        sales_discount: false,
        cash_open: false,
        cash_drawer: false,
        cash_close: false,
      });
      return;
    }

    try {
      let tenantId = currentUser.user_metadata?.tenant_id;
      
      // Force platform admin tenant for global administrators
      if (currentUser.email === 'dary775@gmail.com' || currentUser.email === 'admin@admin.com' || currentUser.email === 'admin@obsidiana.com') {
        tenantId = '51605ab9-958d-4e81-8360-8007fe842c85';
      }

      let dbRole = 'owner';
      let isPlatformAdmin = false;
      
      if (tenantId) {
        const { data: memberData } = await supabase
          .from('tenant_members')
          .select('role')
          .eq('tenant_id', tenantId)
          .eq('user_id', currentUser.id)
          .limit(1)
          .maybeSingle();

        if (memberData) {
          dbRole = memberData.role;
        }

        const { data: tenantData } = await supabase
          .from('tenants')
          .select('is_platform_admin')
          .eq('id', tenantId)
          .maybeSingle();

        if (tenantData?.is_platform_admin === true) {
          isPlatformAdmin = true;
        }
      }

      setRole(dbRole);
      setIsSuperAdmin(isPlatformAdmin);

      if (dbRole === 'owner') {
        setPermissions({
          sales_invoice: true,
          sales_cancel: true,
          sales_discount: true,
          cash_open: true,
          cash_drawer: true,
          cash_close: true,
        });
      } else {
        const userPerms = currentUser.user_metadata?.permissions || {
          sales_invoice: true,
          sales_cancel: false,
          sales_discount: false,
          cash_open: true,
          cash_drawer: false,
          cash_close: true,
        };
        setPermissions(userPerms);
      }
    } catch (err) {
      console.error('Error loading role/permissions:', err);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        await fetchRoleAndPermissions(user);
      } catch (err) {
        console.error('Error getting user:', err);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    let debounceTimer: NodeJS.Timeout | null = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only react to meaningful events, debounce rapid-fire events
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const sessionUser = session?.user ?? null;
          setUser(sessionUser);
          await fetchRoleAndPermissions(sessionUser);
        }, 300);
      } else if (event === 'SIGNED_OUT') {
        if (debounceTimer) clearTimeout(debounceTimer);
        setUser(null);
        setRole('member');
        setIsSuperAdmin(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('tenantId');
        window.location.href = '/login';
      }
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, permissions, isSuperAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/**
 * AuthGuard — Blocks rendering until auth is confirmed.
 * Redirects to /login if user is not authenticated.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, role, permissions, isSuperAdmin } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        window.location.href = '/login';
      } else if (isSuperAdmin) {
        const path = window.location.pathname;
        const isPlatformPath = 
          path.startsWith('/overview') ||
          path.startsWith('/tenants') ||
          path.startsWith('/subscriptions') ||
          path.startsWith('/infrastructure') ||
          path.startsWith('/unauthorized') ||
          path.startsWith('/settings/payments');

        if (!isPlatformPath) {
          window.location.href = '/unauthorized';
        }
      } else {
        const path = window.location.pathname;
        
        // 1. Restrict settings access
        if (path.startsWith('/settings')) {
          if (path.startsWith('/settings/permissions') || path.startsWith('/settings/billing')) {
            if (role !== 'owner') {
              window.location.href = '/unauthorized';
              return;
            }
          } else if (role !== 'owner' && role !== 'admin') {
            window.location.href = '/unauthorized';
            return;
          }
        }

        // 2. Restrict /pos/closure if cash_close is false
        if (path.startsWith('/pos/closure')) {
          if (permissions.cash_close === false) {
            window.location.href = '/unauthorized';
            return;
          }
        }

        // 3. Restrict /pos/billing if sales_invoice is false
        if (path.startsWith('/pos/billing')) {
          if (permissions.sales_invoice === false) {
            window.location.href = '/unauthorized';
            return;
          }
        }
      }
    }
  }, [loading, user, role, permissions]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500"></div>
        <span className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em]">Verificando sesión...</span>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  // Si es Super Admin e intenta renderizar una ruta de tienda, no renderizar nada mientras se procesa la redirección
  if (isSuperAdmin) {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const isPlatformPath = 
      path.startsWith('/overview') ||
      path.startsWith('/tenants') ||
      path.startsWith('/subscriptions') ||
      path.startsWith('/infrastructure') ||
      path.startsWith('/unauthorized') ||
      path.startsWith('/settings/payments');

    if (!isPlatformPath) {
      return null;
    }
  }

  // Prevención de renderizado para usuarios sin autorización antes del redirect
  if (!isSuperAdmin) {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (path.startsWith('/settings')) {
      if ((path.startsWith('/settings/permissions') || path.startsWith('/settings/billing')) && role !== 'owner') {
        return null;
      }
      if (role !== 'owner' && role !== 'admin') {
        return null;
      }
    }
    if (path.startsWith('/pos/closure') && permissions.cash_close === false) {
      return null;
    }
    if (path.startsWith('/pos/billing') && permissions.sales_invoice === false) {
      return null;
    }
  }

  return <>{children}</>;
}

/**
 * PlatformGuard — Only allows access to users whose tenant has is_platform_admin = true.
 * Redirects to /unauthorized if the user is not a super admin.
 */
export function PlatformGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isSuperAdmin } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      window.location.href = '/login';
      return;
    }

    if (!isSuperAdmin) {
      setChecking(false);
      window.location.href = '/unauthorized';
      return;
    }
    setChecking(false);
  }, [user, loading, isSuperAdmin]);

  if (loading || checking || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500"></div>
        <span className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em]">Verificando permisos...</span>
      </div>
    );
  }

  return <>{children}</>;
}
