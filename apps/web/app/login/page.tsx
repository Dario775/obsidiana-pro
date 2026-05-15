'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const IS_DEV = process.env.NODE_ENV === 'development';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  /**
   * Core login logic — shared between form submit and quick login.
   * Determines the user's tenant and redirects accordingly.
   */
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
        let userTenantId = data.user.user_metadata?.tenant_id;
        let tenantData = null;

        // 1. Try with metadata tenant_id
        if (userTenantId) {
          const { data: t } = await supabase
            .from('tenants')
            .select('id, is_platform_admin')
            .eq('id', userTenantId)
            .maybeSingle();
          tenantData = t;
        }

        // 2. Fallback: If not in metadata or tenant doesn't exist, check tenant_members
        if (!tenantData) {
          const { data: memberData } = await supabase
            .from('tenant_members')
            .select('tenant_id')
            .eq('user_id', data.user.id)
            .limit(1)
            .maybeSingle();
          
          if (memberData) {
            userTenantId = memberData.tenant_id;
            const { data: t } = await supabase
              .from('tenants')
              .select('id, is_platform_admin')
              .eq('id', userTenantId)
              .maybeSingle();
            tenantData = t;
          }
        }

        // 3. Last fallback: try to match by store_name (legacy)
        if (!tenantData && data.user.user_metadata?.store_name) {
          const sn = data.user.user_metadata.store_name;
          const { data: matchedTenant } = await supabase
            .from('tenants')
            .select('id, is_platform_admin')
            .or(`nombre.ilike.%${sn}%,slug.ilike.%${sn.replace(/\s+/g, '-')}%`)
            .limit(1)
            .maybeSingle();
          if (matchedTenant) {
            tenantData = matchedTenant;
            userTenantId = matchedTenant.id;
          }
        }

        // SECURITY: If we still don't have a tenant, show error
        if (!tenantData) {
          setError('Tu cuenta no tiene un negocio asignado. Contactá al administrador o registra uno nuevo.');
          setLoading(false);
          return;
        }

        const isSuperAdmin = tenantData.is_platform_admin === true;
        
        if (isSuperAdmin) {
          window.location.href = '/overview';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      console.error('Error de login:', err);
      setError(err.message || err.error_description || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await processLogin(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Obsidiana</h1>
          <p className="text-zinc-500">Inicia sesión en tu panel de administración</p>
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
