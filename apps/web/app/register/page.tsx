'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const passwordStrength = (() => {
    if (password.length === 0) return { label: '', color: '', width: '0%' };
    if (password.length < 6) return { label: 'Muy débil', color: 'bg-red-500', width: '20%' };
    if (password.length < 8) return { label: 'Débil', color: 'bg-orange-500', width: '40%' };
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    const strength = [password.length >= 10, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (strength <= 1) return { label: 'Aceptable', color: 'bg-yellow-500', width: '60%' };
    if (strength <= 2) return { label: 'Fuerte', color: 'bg-emerald-500', width: '80%' };
    return { label: 'Muy fuerte', color: 'bg-emerald-400', width: '100%' };
  })();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }

    try {
      // Use server-side API route for secure registration
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, storeName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al registrarse');
      }

      // Sign in the user after successful registration
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        // User was created but auto-login failed — redirect to login
        router.push('/login');
        return;
      }

      // Redirect to dashboard
      window.location.href = '/dashboard';

    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Obsidiana</h1>
          <p className="text-zinc-500">Crea tu cuenta y empieza a vender</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre del Negocio</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Mi Tienda"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
            {password.length > 0 && (
              <div className="mt-2">
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${passwordStrength.color} transition-all duration-300 rounded-full`}
                    style={{ width: passwordStrength.width }}
                  />
                </div>
                <p className={`text-[10px] mt-1 font-bold uppercase tracking-widest ${
                  passwordStrength.color.includes('red') ? 'text-red-400' :
                  passwordStrength.color.includes('orange') ? 'text-orange-400' :
                  passwordStrength.color.includes('yellow') ? 'text-yellow-400' :
                  'text-emerald-400'
                }`}>{passwordStrength.label}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full bg-zinc-900 border rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                confirmPassword && confirmPassword !== password
                  ? 'border-red-500/50'
                  : confirmPassword && confirmPassword === password
                  ? 'border-emerald-500/50'
                  : 'border-white/10'
              }`}
              placeholder="••••••••"
              required
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || password.length < 8 || password !== confirmPassword}
            className="w-full bg-primary-container hover:bg-primary-container/90 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-zinc-500 text-sm">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-primary hover:text-primary-container transition-colors font-medium">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
