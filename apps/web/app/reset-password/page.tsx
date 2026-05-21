'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/forgot-password');
        return;
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setSaving(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setSaving(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-zinc-500 text-sm font-medium">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-emerald-400 text-4xl">lock_reset</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight">¡Contraseña actualizada!</h2>
            <p className="text-zinc-500 font-medium">Tu contraseña fue cambiada exitosamente. Redirigiendo al login...</p>
          </div>
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
            <h2 className="text-3xl font-black text-white tracking-tight">Nueva contraseña</h2>
            <p className="text-zinc-500 font-medium">Ingresá tu nueva contraseña</p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
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
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetí tu contraseña"
                className="w-full px-4 py-3.5 rounded-xl bg-zinc-900/50 border border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-white placeholder:text-zinc-600"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-violet-500 hover:bg-violet-400 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
