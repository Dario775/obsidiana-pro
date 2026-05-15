'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // ─── Detect OAuth return (both PKCE ?code= and implicit #access_token) ───
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasCode = params.get('code');
    const hasHash = window.location.hash?.includes('access_token');
    const hasError = params.get('error');

    if (hasError) {
      setError(decodeURIComponent(params.get('error_description') || params.get('error') || 'Error de autenticación'));
      return;
    }

    if (hasCode || hasHash) {
      setProcessing(true);
      // Give Supabase a moment to process the code/hash automatically
      setTimeout(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Session established! Now figure out where to go
            await handlePostLogin(session.user);
          } else {
            setProcessing(false);
            setError('No se pudo establecer la sesión. Intentá de nuevo.');
          }
        } catch (err: any) {
          console.error('OAuth error:', err);
          setProcessing(false);
          setError(err.message || 'Error de autenticación');
        }
      }, 1000);
    }
  }, []);

  /**
   * After login (Google or Email), determine where to redirect.
   * Uses the API route for tenant creation to bypass RLS restrictions.
   */
  async function handlePostLogin(user: any) {
    try {
      // 1. Check if user already has a tenant
      const { data: memberData } = await supabase
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (memberData) {
        // Has a tenant — check if super admin
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('is_platform_admin')
          .eq('id', memberData.tenant_id)
          .maybeSingle();

        if (tenantData?.is_platform_admin) {
          window.location.href = '/overview';
        } else {
          window.location.href = '/dashboard';
        }
        return;
      }

      // 2. Also check user_metadata (for legacy email/password users)
      const metaTenantId = user.user_metadata?.tenant_id;
      if (metaTenantId) {
        window.location.href = '/dashboard';
        return;
      }

      // 3. No tenant found — create one via API (bypasses RLS)
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Mi Tienda';

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          storeName: `Tienda de ${userName}`,
          googleUserId: user.id,  // Signal that this is a Google user (no password needed)
        }),
      });

      if (res.ok) {
        window.location.href = '/dashboard';
      } else {
        // If API fails, still try going to dashboard
        console.error('Auto-register failed:', await res.text());
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      console.error('Post-login error:', err);
      // Even if something fails, try to go to dashboard
      window.location.href = '/dashboard';
    }
  }

  // ─── Traditional Email/Password Login ───
  async function processLogin(loginEmail: string, loginPassword: string) {
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (authError) throw authError;

      if (data.user) {
        await handlePostLogin(data.user);
      }
    } catch (err: any) {
      console.error('Error de login:', err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  // ─── Google OAuth Trigger ───
  async function signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Error Google login:', err);
      setError(err.message || 'Error al iniciar sesión con Google');
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await processLogin(email, password);
  };

  // ─── Processing State ───
  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <h2 className="text-white font-black text-lg">Configurando tu cuenta...</h2>
          <p className="text-zinc-500 text-sm">Esto solo toma unos segundos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Obsidiana</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Portal de Administración SaaS</p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={signInWithGoogle}
            className="w-full bg-white text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 border border-white/20 hover:bg-zinc-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-zinc-950 px-4 text-zinc-500">O acceder con email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/30 text-sm"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/30 text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-black py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/10"
            >
              {loading ? 'Iniciando sesión...' : 'Entrar al Panel'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-zinc-500 text-sm">
          ¿No tienes cuenta?{' '}
          <a href="/register" className="text-primary hover:text-primary-container transition-colors font-medium">
            Regístrate
          </a>
        </p>
      </div>
    </div>
  );
}
