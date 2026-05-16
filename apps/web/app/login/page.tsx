'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // ─── Detect OAuth return (PKCE ?code= or implicit #access_token) ───
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
      setTimeout(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
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

  async function handlePostLogin(user: any) {
    try {
      const { data: memberData } = await supabase
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (memberData) {
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

      // Auto-register via API if no tenant found
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Mi Tienda';
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          storeName: `Tienda de ${userName}`,
          googleUserId: user.id,
        }),
      });

      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Post-login error:', err);
      window.location.href = '/dashboard';
    }
  }

  async function processLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (data.user) await handlePostLogin(data.user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/login` },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google');
    }
  }

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
          <h2 className="text-gray-900 font-semibold text-lg">Configurando tu cuenta...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      {/* Logo Area */}
      <div className="mb-8">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shadow-sm border border-purple-200">
          <div className="w-6 h-6 bg-purple-600 rounded-md shadow-inner rotate-45 flex items-center justify-center overflow-hidden">
             <div className="w-full h-1/2 bg-white/20 -rotate-45"></div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[400px]">
        {/* Header Text */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Log in to your account</h1>
          <p className="text-gray-500 text-base">Welcome back! Please enter your details.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-50 p-1 rounded-xl mb-8 border border-gray-100">
          <button 
            onClick={() => router.push('/register')}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-500 rounded-lg hover:text-gray-700 transition-colors"
          >
            Sign up
          </button>
          <button className="flex-1 py-2.5 text-sm font-semibold text-gray-900 bg-white rounded-lg shadow-sm border border-gray-200/50">
            Log in
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Form Area */}
        <form onSubmit={processLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-100 focus:border-purple-600 outline-none transition-all placeholder:text-gray-400 text-gray-900"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-100 focus:border-purple-600 outline-none transition-all placeholder:text-gray-400 text-gray-900 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pb-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer" />
              <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Remember for 30 days</span>
            </label>
            <button type="button" className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors">
              Forgot password
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#7F56D9] text-white py-3.5 rounded-xl font-semibold text-base shadow-sm hover:bg-[#6941C6] transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full bg-white text-gray-700 py-3.5 rounded-xl font-semibold text-base border border-gray-300 flex items-center justify-center gap-3 hover:bg-gray-50 transition-all active:scale-[0.98] shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M5.2662 9.76453C6.19903 6.93863 8.85469 4.90909 12 4.90909C13.6909 4.90909 15.2182 5.50909 16.4182 6.49091L19.9091 3C17.7818 1.14545 15.0545 0 12 0C7.27273 0 3.19091 2.69091 1.23636 6.65455L5.2662 9.76453Z"
              />
              <path
                fill="#34A853"
                d="M16.0409 18.0136C14.8703 18.7164 13.4854 19.0909 12 19.0909C8.85469 19.0909 6.19903 17.0614 5.2662 14.2355L1.23636 17.3455C3.19091 21.3091 7.27273 24 12 24C15.0545 24 17.7818 23.0182 19.8545 21.2727L16.0409 18.0136Z"
              />
              <path
                fill="#4285F4"
                d="M19.8545 21.2727C21.6218 19.7782 22.9091 17.1545 22.9091 13.9091C22.9091 13.1836 22.8436 12.4091 22.7127 11.7273H12V16.6473H18.1527C17.8909 17.8909 17.1545 18.9055 16.0409 19.7455L19.8545 21.2727Z"
              />
              <path
                fill="#FBBC05"
                d="M5.2662 14.2355C5.03182 13.5273 4.90909 12.7745 4.90909 12C4.90909 11.2255 5.03182 10.4727 5.2662 9.76453L1.23636 6.65455C0.447273 8.25818 0 10.08 0 12C0 13.92 0.447273 15.7418 1.23636 17.3455L5.2662 14.2355Z"
              />
            </svg>
            Sign in with Google
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <button 
            onClick={() => router.push('/register')}
            className="font-semibold text-purple-600 hover:text-purple-700 transition-colors"
          >
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
