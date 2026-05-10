'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface MLAppConfig {
  id: string;
  app_client_id: string;
  app_client_secret: string;
  app_redirect_uri: string;
  active: boolean;
}

interface TenantWithML {
  id: string;
  nombre: string;
  slug: string;
  ml_affiliate_id: string | null;
  ml_access_token: string | null;
  ml_refresh_token: string | null;
  ml_token_expires_at: string | null;
}

export default function MLIntegrationPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<MLAppConfig | null>(null);
  const [tenants, setTenants] = useState<TenantWithML[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [selectedTenantData, setSelectedTenantData] = useState<TenantWithML | null>(null);
  const [tenantCode, setTenantCode] = useState('');
  const [form, setForm] = useState({
    app_client_id: '',
    app_client_secret: '',
    app_redirect_uri: '',
  });
  const [tenantStats, setTenantStats] = useState<{
    total: number;
    withAffiliate: number;
    totalClicks: number;
  }>({ total: 0, withAffiliate: 0, totalClicks: 0 });

  const loadConfig = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('key', 'ml_app_config')
      .single();

    if (data?.value) {
      setConfig(data.value as any);
      const parsed = data.value as any;
      setForm({
        app_client_id: parsed.app_client_id || '',
        app_client_secret: parsed.app_client_secret || '',
        app_redirect_uri: parsed.app_redirect_uri || '',
      });
    }

    await loadTenants();
    await loadStats();
    setLoading(false);
  }, []);

  const loadTenants = async () => {
    const { data } = await supabase
      .from('tenants')
      .select('id, nombre, slug, ml_affiliate_id, ml_access_token, ml_refresh_token, ml_token_expires_at')
      .order('nombre');

    if (data) {
      setTenants(data);
    }
  };

  const loadStats = async () => {
    const { count: total } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true });

    const { count: withAffiliate } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .not('ml_affiliate_id', 'is', null);

    const { data: mlProductsData } = await supabase
      .from('ml_products')
      .select('clicks');

    const totalClicks = mlProductsData?.reduce((acc, p) => acc + (p.clicks || 0), 0) || 0;

    setTenantStats({
      total: total || 0,
      withAffiliate: withAffiliate || 0,
      totalClicks,
    });
  };

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (selectedTenant) {
      const tenant = tenants.find(t => t.id === selectedTenant);
      setSelectedTenantData(tenant || null);
    }
  }, [selectedTenant, tenants]);

  async function saveConfig() {
    setSaving(true);

    const newConfig: MLAppConfig = {
      id: config?.id || crypto.randomUUID(),
      app_client_id: form.app_client_id,
      app_client_secret: form.app_client_secret,
      app_redirect_uri: form.app_redirect_uri,
      active: !!form.app_client_id && !!form.app_client_secret,
    };

    await supabase
      .from('platform_settings')
      .upsert({
        key: 'ml_app_config',
        value: newConfig,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    setConfig(newConfig);
    setSaving(false);
    alert('Configuración guardada');
  }

  function generateTenantAuthUrl(tenantId: string) {
    if (!form.app_client_id || !form.app_redirect_uri) {
      alert('Configura el Client ID y Redirect URI primero');
      return '';
    }

    const redirectUri = form.app_redirect_uri;
    const authUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${form.app_client_id}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    return authUrl;
  }

  async function exchangeTenantCode(tenantId: string, code: string) {
    if (!code || !form.app_client_id || !form.app_client_secret || !form.app_redirect_uri) {
      alert('Faltan datos de configuración');
      return;
    }

    setLoading(true);
    try {
      const redirectUri = `${form.app_redirect_uri}?tenant_id=${tenantId}`;
      
      const response = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: form.app_client_id,
          client_secret: form.app_client_secret,
          code: code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al intercambiar código');
      }

      const data = await response.json();

      await supabase
        .from('tenants')
        .update({
          ml_access_token: data.access_token,
          ml_refresh_token: data.refresh_token,
          ml_token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        })
        .eq('id', tenantId);

      setTenantCode('');
      await loadTenants();
      alert('Token guardado en la tienda');
    } catch (error) {
      console.error('Token exchange error:', error);
      alert('Error al obtener token');
    } finally {
      setLoading(false);
    }
  }

  async function refreshTenantToken(tenantId: string) {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant?.ml_refresh_token) {
      alert('No hay refresh token para esta tienda');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: form.app_client_id,
          client_secret: form.app_client_secret,
          refresh_token: tenant.ml_refresh_token,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al refresh token');
      }

      const data = await response.json();

      await supabase
        .from('tenants')
        .update({
          ml_access_token: data.access_token,
          ml_refresh_token: data.refresh_token,
          ml_token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        })
        .eq('id', tenantId);

      await loadTenants();
      alert('Token refrescado');
    } catch (error) {
      console.error('Refresh error:', error);
      alert('Error al refresh token');
    } finally {
      setLoading(false);
    }
  }

  function isTokenExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return true;
    return new Date(expiresAt) <= new Date();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
            ML Integración
          </h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Configura Mercado Libre para todas las tiendas
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg border ${
          config?.active 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <span className="text-xs font-bold uppercase">
            {config?.active ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Total Tiendas</p>
          <p className="text-2xl font-black text-white mt-1">{tenantStats.total}</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Con Afiliado</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{tenantStats.withAffiliate}</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Total Clicks</p>
          <p className="text-2xl font-black text-white mt-1">{tenantStats.totalClicks}</p>
        </div>
      </div>

      {/* App Configuration */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-6">
        <h2 className="text-lg font-black text-white mb-4">Configuración de App ML</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
              APP ID (Client ID)
            </label>
            <input
              type="text"
              value={form.app_client_id}
              onChange={(e) => setForm({ ...form, app_client_id: e.target.value })}
              placeholder="1234567890123456"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
              APP Secret (Client Secret)
            </label>
            <input
              type="password"
              value={form.app_client_secret}
              onChange={(e) => setForm({ ...form, app_client_secret: e.target.value })}
              placeholder="xxxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
            Redirect URI base
          </label>
          <input
            type="url"
            value={form.app_redirect_uri}
            onChange={(e) => setForm({ ...form, app_redirect_uri: e.target.value })}
            placeholder="https://tusitio.com/auth/callback"
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <p className="text-xs text-zinc-600 mt-1">
            URI base. Se añadirá ?tenant_id=XXX automáticamente
          </p>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>

      {/* Tenant Management */}
      {config?.active && (
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-6">
          <h2 className="text-lg font-black text-white mb-4">Autorización por Tienda</h2>
          
          <div className="mb-4">
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
              Seleccionar Tienda
            </label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="">-- Seleccionar tienda --</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre} ({t.slug})
                  {t.ml_access_token ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedTenant && selectedTenantData && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 rounded-lg border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">
                    {selectedTenantData.nombre}
                  </h3>
                  {selectedTenantData.ml_access_token ? (
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      isTokenExpired(selectedTenantData.ml_token_expires_at)
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isTokenExpired(selectedTenantData.ml_token_expires_at)
                        ? 'Expirado'
                        : 'Activo'}
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-1 rounded bg-zinc-700 text-zinc-400">
                      Sin token
                    </span>
                  )}
                </div>

                {selectedTenantData.ml_token_expires_at && (
                  <p className="text-xs text-zinc-500 mb-3">
                    Expira: {new Date(selectedTenantData.ml_token_expires_at).toLocaleString('es-AR')}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {selectedTenantData.ml_access_token ? (
                    <>
                      <button
                        onClick={() => refreshTenantToken(selectedTenant)}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                      >
                        Refrescar Token
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          const url = generateTenantAuthUrl(selectedTenant);
                          if (url) {
                            navigator.clipboard.writeText(url);
                            alert('URL copiada al portapapeles');
                          }
                        }}
                        disabled={loading}
                        className="px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                      >
                        Copiar Link de Auth
                      </button>
                    </>
                  )}
                </div>

                {!selectedTenantData.ml_access_token && (
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                      Código de autorización
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tenantCode}
                        onChange={(e) => setTenantCode(e.target.value)}
                        placeholder="Códigoreceived from ML"
                        className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                      <button
                        onClick={() => exchangeTenantCode(selectedTenant, tenantCode)}
                        disabled={loading || !tenantCode}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                      >
                        Intercambiar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tenant Tokens Table */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-black text-white">Estado de Tokens por Tienda</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">Tienda</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">Affiliate ID</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">Token</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">Expira</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tenants.filter(t => t.ml_access_token).map(t => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4">
                    <span className="text-sm font-bold text-white">{t.nombre}</span>
                  </td>
                  <td className="py-3 px-4">
                    <code className="text-xs text-amber-400">{t.ml_affiliate_id || '—'}</code>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-bold ${
                      isTokenExpired(t.ml_token_expires_at)
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    }`}>
                      {t.ml_access_token ? '✓ Activo' : '✗ Inactivo'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-zinc-400">
                      {t.ml_token_expires_at 
                        ? new Date(t.ml_token_expires_at).toLocaleString('es-AR')
                        : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => refreshTenantToken(t.id)}
                      disabled={loading}
                      className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                    >
                      Refresh
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.filter(t => t.ml_access_token).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    Ninguna tienda tiene token configurado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}