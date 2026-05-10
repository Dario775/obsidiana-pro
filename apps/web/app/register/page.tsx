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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    try {
      // 1. Insert the tenant into the DB first to get its exact ID
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([{
          nombre: storeName,
          slug: storeName.toLowerCase().replace(/\s+/g, '-'),
          status: 'active',
          online_store_enabled: true
        }])
        .select()
        .single();

      if (tenantError || !tenantData) {
        throw tenantError || new Error('No se pudo crear el tenant en la base de datos');
      }

      // 2. Sign up user in Auth and embed the exact tenant_id into their user metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            store_name: storeName,
            tenant_id: tenantData.id
          },
        },
      });

      if (error) {
        // Clean up inserted tenant if signup fails
        await supabase.from('tenants').delete().eq('id', tenantData.id);
        throw error;
      }

      if (data.user) {
        // Store tenantId in localStorage so useTenant picks it up instantly
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('tenantId', tenantData.id);
        }
        router.push('/dashboard');
        router.refresh();
      }
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
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container hover:bg-primary-container/90 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
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
