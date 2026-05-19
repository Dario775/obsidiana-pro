'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('tenantId');
      window.location.href = '/login';
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
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
  const { user, loading } = useAuth();

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
      }
    }
  }, [loading, user]);

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
