'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const router = useRouter();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('El formato del email no es válido');
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });

      if (resetError) throw resetError;
      setSent(true);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Too many requests') || msg.includes('rate limit')) {
        setError('Demasiados intentos. Esperá unos minutos y volvÉ a intentar.');
      } else {
        setError(err.message || 'Error al enviar el email de recuperación');
      }
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        </div>

        <div className="relative z-10 text-center space-y-6 max-w-md p-8 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-md">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <span className="material-symbols-outlined text-emerald-400 text-3xl">mail</span>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-white tracking-tight">¡Email enviado!</h2>
            <p className="text-sm text-zinc-300 font-medium leading-relaxed">
              Revisá tu bandeja de entrada en <span className="text-violet-400 font-bold">{email}</span>.
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Te enviamos un enlace de recuperación. Seguí las instrucciones del mensaje para restablecer tu contraseña de forma segura.
            </p>
          </div>
          <div className="pt-4 border-t border-white/5">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-white py-3 px-6 rounded-xl font-bold text-sm border border-white/10 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[16px] mr-2">arrow_back</span>
              Volver al Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      <div className="w-full max-w-[420px] z-10 space-y-6">
        <Link href="/login" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group">
          <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="text-xs font-bold uppercase tracking-wider">Volver al login</span>
        </Link>

        <div className="p-8 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-md space-y-6 shadow-xl">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/5 border border-white/5 flex items-center justify-center">
              <img src="/logo.png" alt="Obsidiana" className="w-5 h-5 object-contain rounded-md" />
            </div>
            <span className="text-md font-black text-white tracking-tight">Obsidiana</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight leading-none">Recuperar contraseña</h2>
            <p className="text-sm text-zinc-500 font-medium leading-relaxed">Ingresá tu email y te enviaremos un link para restablecerla</p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="tu@email.com"
                className="w-full px-4 py-3.5 rounded-xl bg-zinc-900/50 border border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-white placeholder:text-zinc-600 text-sm"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-500 hover:bg-violet-400 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperación'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
