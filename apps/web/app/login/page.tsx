'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasCode = params.get('code');
    const hasHash = window.location.hash?.includes('access_token');
    const hasError = params.get('error');
    const hasMessage = params.get('message');

    if (hasMessage) {
      setInfoMessage(decodeURIComponent(hasMessage));
    }

    if (hasError) {
      setError(decodeURIComponent(params.get('error_description') || params.get('error') || 'Error de autenticación'));
      return;
    }

    if (hasCode || hasHash) {
      setProcessing(true);
      const checkSession = async () => {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (session?.user) {
            await handlePostLogin(session.user);
          } else {
            setTimeout(async () => {
              try {
                const { data: { session: retrySession } } = await supabase.auth.getSession();
                if (retrySession?.user) {
                  await handlePostLogin(retrySession.user);
                } else {
                  setProcessing(false);
                  setError('No se pudo validar la sesión. Por favor, intenta ingresar de nuevo.');
                }
              } catch {
                setProcessing(false);
                setError('Error al validar la sesión. Por favor, intenta ingresar de nuevo.');
              }
            }, 1500);
          }
        } catch {
          setProcessing(false);
          setError('Error de conexión con el servidor de autenticación.');
        }
      };
      checkSession();
    }
  }, []);

  async function handlePostLogin(user: any) {
    try {
      let tenantId = user.user_metadata?.tenant_id;
      
      // Force platform admin tenant for global administrators
      if (user.email === 'dary775@gmail.com' || user.email === 'admin@admin.com' || user.email === 'admin@obsidiana.com') {
        tenantId = '51605ab9-958d-4e81-8360-8007fe842c85';
      }

      if (tenantId) {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('is_platform_admin, status')
          .eq('id', tenantId)
          .maybeSingle();
        if (tenantError) throw tenantError;
        if (tenantData?.status !== 'active') {
          setProcessing(false);
          setError('Tu cuenta está suspendida. Contactá al soporte.');
          return;
        }
        if (tenantData?.is_platform_admin === true) {
          router.refresh();
          window.location.href = '/overview';
          return;
        }
      }

      const { data: memberData, error: memberError } = await supabase
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (memberError) throw memberError;

      if (memberData) {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('is_platform_admin, status')
          .eq('id', memberData.tenant_id)
          .maybeSingle();
        if (tenantError) throw tenantError;
        if (tenantData?.status !== 'active') {
          setProcessing(false);
          setError('Tu cuenta está suspendida. Contactá al soporte.');
          return;
        }
        const target = tenantData?.is_platform_admin ? '/overview' : '/dashboard';
        router.refresh();
        window.location.href = target;
        return;
      }

      const storedStoreName = typeof window !== 'undefined' ? sessionStorage.getItem('pendingStoreName') : null;
      const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Mi Tienda';
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, storeName: storedStoreName || `Tienda de ${userName}`, googleUserId: user.id }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al crear tu negocio');
      }

      if (typeof window !== 'undefined') sessionStorage.removeItem('pendingStoreName');
      router.refresh();
      window.location.href = '/dashboard';
    } catch (err: any) {
      setProcessing(false);
      setError(err.message || 'Error al completar el inicio de sesión.');
    }
  }

  async function processLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (data.user) await handlePostLogin(data.user);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) {
        setError('Credenciales inválidas');
      } else if (msg.includes('Email not confirmed') || msg.includes('not confirmed')) {
        setError('Tu email no ha sido confirmado. Revisá tu bandeja de entrada.');
      } else if (msg.includes('Too many requests') || msg.includes('rate limit')) {
        setError('Demasiados intentos. Esperá unos minutos y volvÉ a intentar.');
      } else {
        setError('Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError('');
    setGoogleLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        },
      });
    } catch {
      setError('No pudimos conectar con Google. Reintenta en unos instantes.');
      setGoogleLoading(false);
    }
  }

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 border-4 border-violet-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-violet-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white tracking-tight">Validando acceso...</h2>
            <p className="text-zinc-500 text-sm font-medium">Preparando tu panel de administración</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-zinc-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/3 rounded-full blur-[200px]"></div>
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col justify-between p-12 xl:p-16 z-10">
        {/* Top */}
        <div className="relative">
          <Link href="/" className="flex items-center gap-3 mb-8 group">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
              <span className="material-symbols-outlined text-violet-400 text-2xl">storefront</span>
            </div>
            <span className="text-lg font-black text-white tracking-tight">Obsidiana</span>
            <span className="material-symbols-outlined text-zinc-600 text-sm ml-2 group-hover:text-zinc-400 transition-colors">arrow_back</span>
          </Link>
        </div>

        {/* Center - Hero */}
        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl xl:text-6xl font-black text-white tracking-tight leading-[0.95]">
              Tu negocio,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                sin límites
              </span>
            </h1>
            <p className="text-lg text-zinc-400 font-medium leading-relaxed">
              Gestiona inventario, ventas, punto de venta y tu tienda online desde un solo lugar.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            {[
              { icon: 'point_of_sale', label: 'POS Profesional' },
              { icon: 'inventory_2', label: 'Inventario en tiempo real' },
              { icon: 'language', label: 'Tienda Online' },
              { icon: 'analytics', label: 'Analíticas' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/50 border border-white/5 backdrop-blur-sm">
                <span className="material-symbols-outlined text-violet-400 text-[16px]">{f.icon}</span>
                <span className="text-xs font-bold text-zinc-300">{f.label}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/5">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '<50ms', label: 'Latencia' },
              { value: '24/7', label: 'Soporte' },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="flex items-center gap-4 text-zinc-600">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center">
                <span className="material-symbols-outlined text-[12px] text-zinc-500">person</span>
              </div>
            ))}
          </div>
          <p className="text-xs font-medium">+2,500 negocios confían en nosotros</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6 sm:p-10 z-10">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-3 mb-10 group">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-violet-400">storefront</span>
            </div>
            <span className="text-lg font-black text-white">Obsidiana</span>
            <span className="material-symbols-outlined text-zinc-600 text-sm ml-2">arrow_back</span>
          </Link>

          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white tracking-tight">Bienvenido</h2>
              <p className="text-zinc-500 font-medium">Ingresá a tu panel de administración</p>
            </div>

            {/* Toggle */}
            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5">
              <button onClick={() => router.push('/register')} className="flex-1 py-2.5 text-sm font-bold text-zinc-500 rounded-lg hover:text-white transition-colors">
                Registrarse
              </button>
              <button className="flex-1 py-2.5 text-sm font-bold text-white bg-zinc-800 rounded-lg shadow-lg border border-white/10">
                Ingresar
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            {/* Info message */}
            {infoMessage && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                {infoMessage}
              </div>
            )}

            {/* Form */}
            <form onSubmit={processLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); setInfoMessage(''); }}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3.5 rounded-xl bg-zinc-900/50 border border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-white placeholder:text-zinc-600"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); setInfoMessage(''); }}
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 rounded-xl bg-zinc-900/50 border border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-white placeholder:text-zinc-600 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded bg-zinc-900 border-white/10 text-violet-500 focus:ring-violet-500/20 focus:ring-offset-0" />
                  <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Recordarme</span>
                </label>
                <button type="button" onClick={() => router.push('/forgot-password')} className="text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-500 hover:bg-violet-400 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Ingresando...' : 'Entrar al Panel'}
              </button>

              <div className="relative flex items-center gap-4">
                <div className="flex-1 h-px bg-white/5"></div>
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">o</span>
                <div className="flex-1 h-px bg-white/5"></div>
              </div>

              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={googleLoading}
                className="w-full bg-zinc-900/50 text-zinc-300 py-3.5 rounded-xl font-bold text-sm border border-white/10 flex items-center justify-center gap-3 hover:bg-zinc-900 hover:border-white/20 transition-all disabled:opacity-50"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M5.2662 9.76453C6.19903 6.93863 8.85469 4.90909 12 4.90909C13.6909 4.90909 15.2182 5.50909 16.4182 6.49091L19.9091 3C17.7818 1.14545 15.0545 0 12 0C7.27273 0 3.19091 2.69091 1.23636 6.65455L5.2662 9.76453Z" />
                    <path fill="#34A853" d="M16.0409 18.0136C14.8703 18.7164 13.4854 19.0909 12 19.0909C8.85469 19.0909 6.19903 17.0614 5.2662 14.2355L1.23636 17.3455C3.19091 21.3091 7.27273 24 12 24C15.0545 24 17.7818 23.0182 19.8545 21.2727L16.0409 18.0136Z" />
                    <path fill="#4285F4" d="M19.8545 21.2727C21.6218 19.7782 22.9091 17.1545 22.9091 13.9091C22.9091 13.1836 22.8436 12.4091 22.7127 11.7273H12V16.6473H18.1527C17.8909 17.8909 17.1545 18.9055 16.0409 19.7455L19.8545 21.2727Z" />
                    <path fill="#FBBC05" d="M5.2662 14.2355C5.03182 13.5273 4.90909 12.7745 4.90909 12C4.90909 11.2255 5.03182 10.4727 5.2662 9.76453L1.23636 6.65455C0.447273 8.25818 0 10.08 0 12C0 13.92 0.447273 15.7418 1.23636 17.3455L5.2662 14.2355Z" />
                  </svg>
                )}
                {googleLoading ? 'Conectando...' : 'Continuar con Google'}
              </button>
            </form>

            <p className="text-center text-sm text-zinc-500">
              ¿No tenés cuenta?{' '}
              <button onClick={() => router.push('/register')} className="font-bold text-violet-400 hover:text-violet-300 transition-colors">
                Crear cuenta gratis
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
