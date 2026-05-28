'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Strict validation regex patterns to prevent code injection and ensure correct formats
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const storeNameRegex = /^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ\s.,'\-&()]+$/;

    // 1. Email format check
    if (!emailRegex.test(email)) {
      setError('El formato del correo electrónico no es válido.');
      return;
    }

    // 2. Business Name safety & sanity check
    if (storeName.length < 3 || storeName.length > 50) {
      setError('El nombre del negocio debe tener entre 3 y 50 caracteres.');
      return;
    }
    if (!storeNameRegex.test(storeName)) {
      setError('El nombre del negocio contiene caracteres no permitidos. Solo se permiten letras, números, espacios y signos básicos (.,\'-&()).');
      return;
    }

    // 3. Password length check
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    // 4. Password match check
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword, storeName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrarse');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    try {
      setGoogleLoading(true);
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google');
      setGoogleLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 text-center space-y-6 max-w-md p-8 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-md">
          <div className="w-16 h-16 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <span className="material-symbols-outlined text-violet-400 text-3xl">mail</span>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-white tracking-tight">¡Verificá tu email!</h2>
            <p className="text-sm text-zinc-300 font-medium leading-relaxed">
              Hemos enviado un enlace de confirmación a <span className="text-violet-400 font-bold">{email}</span>.
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Por favor, revisá tu bandeja de entrada (y la carpeta de spam) y hacé clic en el enlace para activar tu cuenta y poder ingresar.
            </p>
          </div>
          <div className="pt-4 border-t border-white/5">
            <Link 
              href="/login" 
              className="inline-flex w-full items-center justify-center bg-violet-500 hover:bg-violet-400 text-white py-3 px-6 rounded-xl font-bold text-sm tracking-wider uppercase shadow-lg shadow-violet-500/10 active:scale-[0.98] transition-all"
            >
              Ir a Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-zinc-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col justify-between p-12 xl:p-16 z-10">
        <div className="relative">
          <Link href="/" className="flex items-center gap-3 mb-8 group">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/5 border border-white/5 flex items-center justify-center group-hover:bg-violet-500/10 transition-colors">
              <img src="/logo.png" alt="Obsidiana" className="w-6 h-6 object-contain rounded-md" />
            </div>
            <span className="text-lg font-black text-white tracking-tight">Obsidiana</span>
            <span className="material-symbols-outlined text-zinc-600 text-sm ml-2 group-hover:text-zinc-400 transition-colors">arrow_back</span>
          </Link>
        </div>

        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl xl:text-6xl font-black text-white tracking-tight leading-[0.95]">
              Empezá hoy,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                crecé mañana
              </span>
            </h1>
            <p className="text-lg text-zinc-400 font-medium leading-relaxed">
              Creá tu cuenta gratis y tené acceso a todas las herramientas que tu negocio necesita.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4">
            {[
              { icon: 'rocket_launch', title: 'Setup en 2 minutos', desc: 'Sin configuraciones complejas' },
              { icon: 'credit_card', title: 'Sin tarjeta requerida', desc: '14 días de prueba gratis' },
              { icon: 'support_agent', title: 'Soporte incluido', desc: 'Chat en vivo 24/7' },
            ].map((b, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900/30 border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-violet-400 text-[18px]">{b.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{b.title}</p>
                  <p className="text-xs text-zinc-500">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom - Testimonial */}
        <div className="space-y-4 max-w-md">
          <div className="p-5 rounded-2xl bg-zinc-900/30 border border-white/5 backdrop-blur-sm space-y-3">
            <div className="flex gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="material-symbols-outlined text-[16px] fill-current">star</span>
              ))}
            </div>
            <p className="text-sm text-zinc-300 font-medium leading-relaxed italic">
              "La migración a Obsidiana fue súper simple. El soporte nos ayudó en cada paso y la tienda online integrada empezó a vender en menos de 24 horas."
            </p>
            <div className="flex items-center gap-3 pt-2 border-t border-white/5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                SR
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">Sofía Rossi</p>
                <p className="text-[10px] font-medium text-zinc-500 mt-0.5">Socia Gerente en Nexo Tienda</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6 sm:p-10 z-10">
        <div className="w-full max-w-[420px]">
          <Link href="/" className="lg:hidden flex items-center gap-3 mb-10 group">
            <div className="w-10 h-10 rounded-xl bg-violet-500/5 border border-white/5 flex items-center justify-center">
              <img src="/logo.png" alt="Obsidiana" className="w-5 h-5 object-contain rounded-md" />
            </div>
            <span className="text-lg font-black text-white">Obsidiana</span>
            <span className="material-symbols-outlined text-zinc-600 text-sm ml-2">arrow_back</span>
          </Link>

          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white tracking-tight">Crear cuenta</h2>
              <p className="text-zinc-500 font-medium">Empezá tu prueba gratuita de 14 días</p>
            </div>

            <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/5">
              <button className="flex-1 py-2.5 text-sm font-bold text-white bg-zinc-800 rounded-lg shadow-lg border border-white/10">
                Registrarse
              </button>
              <button onClick={() => router.push('/login')} className="flex-1 py-2.5 text-sm font-bold text-zinc-500 rounded-lg hover:text-white transition-colors">
                Ingresar
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Nombre del negocio</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ej: Mi Tienda"
                  className="w-full px-4 py-3.5 rounded-xl bg-zinc-900/50 border border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-white placeholder:text-zinc-600"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-3.5 rounded-xl bg-zinc-900/50 border border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-white placeholder:text-zinc-600 pr-12"
                    required
                    minLength={8}
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Confirmar contraseña</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repetí tu contraseña"
                    className="w-full px-4 py-3.5 rounded-xl bg-zinc-900/50 border border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-white placeholder:text-zinc-600 pr-12"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-500 hover:bg-violet-400 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
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
                {googleLoading ? 'Conectando...' : 'Registrarse con Google'}
              </button>
            </form>

            <p className="text-center text-sm text-zinc-500">
              ¿Ya tenés cuenta?{' '}
              <button onClick={() => router.push('/login')} className="font-bold text-violet-400 hover:text-violet-300 transition-colors">
                Iniciar sesión
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
