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
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-emerald-400 text-4xl">mail</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Email enviado</h2>
            <p className="text-zinc-500 font-medium">
              Revisá tu bandeja de entrada en <span className="text-white font-semibold">{email}</span> y seguí las instrucciones para restablecer tu contraseña.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Volver al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-[420px] z-10">
        <Link href="/login" className="flex items-center gap-2 mb-8 text-zinc-500 hover:text-white transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span className="text-sm font-bold">Volver al login</span>
        </Link>

        <div className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white tracking-tight">Recuperar contraseña</h2>
            <p className="text-zinc-500 font-medium">Ingresá tu email y te enviaremos un link para restablecerla</p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-5">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-500 hover:bg-violet-400 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperación'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
