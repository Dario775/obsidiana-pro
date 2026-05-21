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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: 'member',
  permissions: {
    sales_invoice: false,
    sales_cancel: false,
    sales_discount: false,
    cash_open: false,
    cash_drawer: false,
    cash_close: false,
  },
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>('owner');
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
      const tenantId = currentUser.user_metadata?.tenant_id;
      let dbRole = 'owner'; // Fallback for owner registration
      
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
      }

      setRole(dbRole);

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
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      await fetchRoleAndPermissions(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      await fetchRoleAndPermissions(sessionUser);
    });

    return () => subscription.unsubscribe();
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
    <AuthContext.Provider value={{ user, loading, role, permissions, signOut }}>
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
  const { user, loading, role, permissions } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        window.location.href = '/login';
      } else if (user.email === 'admin@admin.com') {
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
  if (user.email === 'admin@admin.com') {
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
  if (user.email !== 'admin@admin.com') {
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
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      if (loading) return;
      if (!user) {
        window.location.href = '/login';
        return;
      }

      try {
        // El Super Admin es único y se identifica por su email admin@admin.com
        if (user.email === 'admin@admin.com') {
          setIsAdmin(true);
        } else {
          // Cualquier otro usuario tiene prohibido el acceso al panel global
          window.location.href = '/unauthorized';
        }
      } catch {
        window.location.href = '/unauthorized';
      } finally {
        setChecking(false);
      }
    }

    checkAdmin();
  }, [user, loading]);

  if (loading || checking || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500"></div>
        <span className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em]">Verificando permisos...</span>
      </div>
    );
  }

  return <>{children}</>;
}
