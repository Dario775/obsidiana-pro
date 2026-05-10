'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Intentando login con:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Respuesta:', { data, error });

      if (error) throw error;

      if (data.user) {
        console.log('Login exitoso, redirigiendo...');
        if (email === 'admin@obsidiana.com') {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('tenantId');
          }
          window.location.href = '/overview';
        } else {
          let userTenantId = data.user.user_metadata?.tenant_id;

          if (!userTenantId && data.user.user_metadata?.store_name) {
            const sn = data.user.user_metadata.store_name;
            const { data: matchedTenant } = await supabase
              .from('tenants')
              .select('id')
              .or(`nombre.ilike.%${sn}%,slug.ilike.%${sn.replace(/\s+/g, '-')}%`)
              .limit(1)
              .maybeSingle();
            if (matchedTenant) {
              userTenantId = matchedTenant.id;
            }
          }

          if (!userTenantId) {
            const { data: latestTenant } = await supabase
              .from('tenants')
              .select('id')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (latestTenant) {
              userTenantId = latestTenant.id;
            }
          }

          if (userTenantId && typeof window !== 'undefined') {
            window.localStorage.setItem('tenantId', userTenantId);
          }
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      console.error('Error de login:', err);
      setError(err.message || err.error_description || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email: string, password: string, role: string) => {
    setLoading(true);
    setError('');
    
    try {
      console.log(`[DEV] Login rápido como ${role}...`);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error en login rápido:', error);
        setError(`Error: ${error.message}. Intentá recargar la página.`);
        return;
      }

      if (data.user) {
        console.log(`[DEV] Login como ${role} exitoso`);
        if (email === 'admin@obsidiana.com' || role === 'Super Admin') {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('tenantId');
          }
          window.location.href = '/overview';
        } else {
          let userTenantId = data.user.user_metadata?.tenant_id;

          if (!userTenantId && data.user.user_metadata?.store_name) {
            const sn = data.user.user_metadata.store_name;
            const { data: matchedTenant } = await supabase
              .from('tenants')
              .select('id')
              .or(`nombre.ilike.%${sn}%,slug.ilike.%${sn.replace(/\s+/g, '-')}%`)
              .limit(1)
              .maybeSingle();
            if (matchedTenant) {
              userTenantId = matchedTenant.id;
            }
          }

          if (!userTenantId) {
            const { data: latestTenant } = await supabase
              .from('tenants')
              .select('id')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (latestTenant) {
              userTenantId = latestTenant.id;
            }
          }

          if (userTenantId && typeof window !== 'undefined') {
            window.localStorage.setItem('tenantId', userTenantId);
          }
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Obsidiana</h1>
          <p className="text-zinc-500">Inicia sesión en tu panel de administración</p>
        </div>

        {/* ACCESO RÁPIDO - SOLO PARA DESARROLLO */}
        <div className="mb-8 p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-amber-400 text-xl">🚀</span>
            <h2 className="text-amber-400 font-black text-sm uppercase tracking-widest">
              Acceso Rápido (Desarrollo)
            </h2>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => quickLogin('demo@test.com', 'Demo1234', 'Dueño de Negocio')}
              disabled={loading}
              className="w-full min-h-11 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined shrink-0 text-[18px]">store</span>
              <span className="leading-tight text-center">Entrar como Dueño de Tienda</span>
            </button>
            
            <button
              onClick={() => quickLogin('admin@obsidiana.com', 'AdminObsidiana123', 'Super Admin')}
              disabled={loading}
              className="w-full min-h-11 bg-violet-600 hover:bg-violet-500 text-white px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined shrink-0 text-[18px]">admin_panel_settings</span>
              <span className="leading-tight text-center">Entrar como Super Admin</span>
            </button>
          </div>
          
          <p className="mt-3 text-[10px] text-amber-500/60 text-center uppercase tracking-wider">
            Estos botones son solo para desarrollo
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-container hover:bg-primary-container/90 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

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
