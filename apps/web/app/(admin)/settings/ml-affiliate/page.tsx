'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

interface ImportedProduct {
  id: string;
  ml_item_id: string;
  title: string;
  price: number;
  currency: string;
  thumbnail: string;
  clicks: number;
  imported_at: string;
}

/**
 * Platform config — only stores client_id and redirect_uri for the frontend.
 * client_secret is NEVER sent to the browser.
 */
interface PlatformConfigPublic {
  app_client_id: string;
  app_redirect_uri: string;
}

interface MLStats {
  totalClicks: number;
  monthlyClicks: number;
  topProducts: { title: string; clicks: number }[];
}

export default function MLAffiliatePage() {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfigPublic | null>(null);
  const [stats, setStats] = useState<MLStats>({
    totalClicks: 0,
    monthlyClicks: 0,
    topProducts: [],
  });

  const [form, setForm] = useState({
    ml_affiliate_id: '',
  });
  
  // Only track connection status — no tokens stored in frontend state
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean;
    expiresAt: string | null;
  }>({
    isConnected: false,
    expiresAt: null,
  });

  const isConnected = connectionStatus.isConnected;

  useEffect(() => {
    if (tenant?.id) {
      loadConfig();
      loadPlatformConfig();
      loadImportedProducts();
      loadStats();
    }
  }, [tenant?.id]);

  const loadPlatformConfig = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'ml_app_config')
      .single();

    if (data?.value) {
      const config = data.value as any;
      // Only extract public fields — NEVER expose client_secret
      setPlatformConfig({
        app_client_id: config.app_client_id || '',
        app_redirect_uri: config.app_redirect_uri || '',
      });
    }
  };

  const loadStats = async () => {
    if (!tenant?.id) return;

    // Get total clicks from ml_products
    const { data: products } = await supabase
      .from('ml_products')
      .select('title, clicks')
      .eq('tenant_id', tenant.id)
      .order('clicks', { ascending: false })
      .limit(10);

    const totalClicks = products?.reduce((sum, p) => sum + (p.clicks || 0), 0) || 0;

    // Get monthly clicks from ml_clicks_log (correct source)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count: monthlyClicks } = await supabase
      .from('ml_clicks_log')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('clicked_at', startOfMonth);

    const topProducts = (products || [])
      .filter(p => (p.clicks || 0) > 0)
      .slice(0, 3)
      .map(p => ({ title: p.title, clicks: p.clicks }));

    setStats({
      totalClicks,
      monthlyClicks: monthlyClicks || 0,
      topProducts,
    });
  };

  async function loadConfig() {
    // Only load affiliate_id and connection status — NOT the actual tokens
    const { data } = await supabase
      .from('tenants')
      .select('ml_affiliate_id, ml_token_expires_at')
      .eq('id', tenant?.id)
      .single();

    if (data) {
      setForm({
        ml_affiliate_id: data.ml_affiliate_id || '',
      });
      
      // Determine connection status without exposing tokens
      const hasToken = !!data.ml_token_expires_at;
      const isExpired = data.ml_token_expires_at 
        ? new Date(data.ml_token_expires_at) <= new Date() 
        : true;

      setConnectionStatus({
        isConnected: hasToken && !isExpired,
        expiresAt: data.ml_token_expires_at,
      });
    }
  }

  async function saveConfig() {
    if (!tenant?.id) return;
    setSaving(true);

    await supabase
      .from('tenants')
      .update({
        ml_affiliate_id: form.ml_affiliate_id,
      })
      .eq('id', tenant.id);

    setSaving(false);
    alert('Configuración guardada');
  }

  async function refreshToken() {
    if (!tenant?.id) return;
    
    setLoading(true);
    try {
      // Refresh via server-side API — secret stays on server
      const response = await fetch('/api/ml/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenant.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Error al refrescar token');
        if (data.error?.includes('Reconnect') || response.status === 400) {
          setConnectionStatus({ isConnected: false, expiresAt: null });
        }
        return;
      }

      setConnectionStatus({
        isConnected: true,
        expiresAt: data.expires_at,
      });
      alert('Token actualizado correctamente');
    } catch (error) {
      console.error('Refresh error:', error);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  async function connectWithML() {
    if (!platformConfig?.app_client_id || !platformConfig?.app_redirect_uri) {
      alert('Configuración de ML no disponible. Contacta al administrador.');
      return;
    }

    if (!tenant?.id) {
      alert('Error: ID de tienda no encontrado');
      return;
    }

    const redirectUri = platformConfig.app_redirect_uri;
    const authUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${platformConfig.app_client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${tenant.id}`;
    
    window.location.href = authUrl;
  }

  async function disconnect() {
    if (!confirm('¿Desconectar de Mercado Libre?')) return;

    await supabase
      .from('tenants')
      .update({
        ml_access_token: null,
        ml_refresh_token: null,
        ml_token_expires_at: null,
      })
      .eq('id', tenant?.id);

    setConnectionStatus({ isConnected: false, expiresAt: null });
  }

  async function loadImportedProducts() {
    if (!tenant?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('ml_products')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('imported_at', { ascending: false });

    if (data) {
      setImportedProducts(data);
    }
    setLoading(false);
  }

  async function searchMLProducts() {
    if (!searchQuery.trim()) {
      alert('Ingresa un término de búsqueda');
      return;
    }

    if (!isConnected) {
      alert('Conecta con Mercado Libre primero');
      return;
    }

    setSearching(true);
    try {
      // Search via server-side API — token never reaches browser
      const response = await fetch('/api/ml/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          tenant_id: tenant?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsReconnect) {
          setConnectionStatus({ isConnected: false, expiresAt: null });
          alert('Sesión expirada. Reconecta con Mercado Libre.');
        } else {
          alert(data.error || 'Error en la búsqueda');
        }
        return;
      }

      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      alert('Error al buscar');
    } finally {
      setSearching(false);
    }
  }

  function toggleSelect(productId: string) {
    setSelectedIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }

  async function importSelectedProducts() {
    if (!tenant?.id || !form.ml_affiliate_id || selectedIds.length === 0) {
      alert('Configura tu ID de afiliado primero');
      return;
    }

    setLoading(true);

    try {
      for (const productId of selectedIds) {
        const product = searchResults.find(p => p.id === productId);
        if (!product) continue;

        const thumbnail = product.pictures?.[0] || product.thumbnail;

        await supabase.from('ml_products').upsert({
          tenant_id: tenant.id,
          ml_item_id: product.id,
          title: product.title,
          price: product.price,
          currency: product.currency,
          thumbnail: thumbnail,
          pictures: product.pictures,
          condition: product.condition,
          permalink: product.permalink,
          affiliate_url: '', // Will be generated dynamically using the Barra de Afiliados URL or manually set
          clicks: 0,
        }, {
          onConflict: 'tenant_id,ml_item_id',
        });
      }

      setSelectedIds([]);
      setSearchResults([]);
      setSearchQuery('');
      await loadImportedProducts();
    } catch (error) {
      console.error('Import error:', error);
      alert('Error al importar');
    } finally {
      setLoading(false);
    }
  }

  async function removeProduct(productId: string) {
    if (!confirm('¿Eliminar?')) return;

    await supabase
      .from('ml_products')
      .delete()
      .eq('id', productId);

    await loadImportedProducts();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">ML Afiliado</h1>
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
          Gana comisiones affiliando productos de Mercado Libre
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isConnected ? 'bg-emerald-500/20' : 'bg-zinc-800'
            }`}>
              <span className="material-symbols-outlined text-2xl text-yellow-400">local_offer</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Mercado Libre</h2>
              <p className={`text-sm ${
                isConnected ? 'text-emerald-400' : 'text-zinc-500'
              }`}>
                {isConnected ? '✓ Conectado' : 'No conectado'}
              </p>
              {connectionStatus.expiresAt && (
                <p className="text-xs text-zinc-600">
                  Expira: {new Date(connectionStatus.expiresAt).toLocaleString('es-AR')}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected && (
              <>
                <button
                  onClick={refreshToken}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg font-bold text-sm disabled:opacity-50"
                >
                  Refrescar
                </button>
                <button
                  onClick={disconnect}
                  className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-bold text-sm"
                >
                  Desconectar
                </button>
              </>
            )}
            {!isConnected && (
              <button
                onClick={connectWithML}
                disabled={!platformConfig || !tenant?.id}
                className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black rounded-xl font-bold disabled:opacity-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined">link</span>
                Conectar con Mercado Libre
              </button>
            )}
          </div>
        </div>
        
        {!platformConfig && (
          <p className="text-xs text-amber-400 mt-4">
            ML no configurado. Contacta al administrador.
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-amber-400">touch_logger</span>
            <p className="text-xs text-zinc-500 font-bold uppercase">Total Clicks</p>
          </div>
          <p className="text-3xl font-black text-white">{stats.totalClicks}</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-violet-400">calendar_month</span>
            <p className="text-xs text-zinc-500 font-bold uppercase">Este Mes</p>
          </div>
          <p className="text-3xl font-black text-white">{stats.monthlyClicks}</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-emerald-400">trending_up</span>
            <p className="text-xs text-zinc-500 font-bold uppercase">Top Productos</p>
          </div>
          <div className="space-y-1">
            {stats.topProducts.length > 0 ? (
              stats.topProducts.map((p, i) => (
                <p key={i} className="text-xs text-white truncate">
                  <span className="text-amber-400">{i + 1}.</span> {p.title?.slice(0, 25)} ({p.clicks})
                </p>
              ))
            ) : (
              <p className="text-xs text-zinc-600">Sin datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Affiliate ID */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-6">
        <h2 className="text-lg font-black text-white mb-4">ID de Afiliado</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={form.ml_affiliate_id}
              onChange={(e) => setForm({ ...form, ml_affiliate_id: e.target.value })}
              placeholder="Tu ID de afiliado (ej: xxxxx12345)"
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <p className="text-xs text-zinc-600 mt-1">
              Obténlo en Mercado Libre → Programa de Afiliados
            </p>
          </div>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-6">
        <h2 className="text-lg font-black text-white mb-4">Buscar Productos</h2>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchMLProducts()}
              placeholder="Buscar productos en Mercado Libre..."
              className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <button
            onClick={searchMLProducts}
            disabled={searching || !searchQuery.trim() || !isConnected}
            className="px-6 py-3 bg-violet-500 hover:bg-violet-400 text-white rounded-xl font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {searching ? (
              <span className="material-symbols-outlined animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined">search</span>
            )}
            Buscar
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-zinc-400">{searchResults.length} resultados</p>
              <button
                onClick={importSelectedProducts}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold text-sm disabled:opacity-50"
              >
                Importar ({selectedIds.length})
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-80 overflow-y-auto">
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  onClick={() => toggleSelect(product.id)}
                  className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                    selectedIds.includes(product.id)
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-transparent hover:border-white/20'
                  }`}
                >
                  <div className="aspect-square bg-zinc-800">
                    {product.thumbnail ? (
                      <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-zinc-600">image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-white line-clamp-2">{product.title}</p>
                    <p className="text-sm font-bold text-amber-400">
                      ${product.price?.toLocaleString('es-AR')}
                    </p>
                  </div>
                  {selectedIds.includes(product.id) && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-sm">check</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Imported Products */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-lg font-black text-white">Productos en Tu Tienda</h2>
          <p className="text-xs text-zinc-500">{importedProducts.length} productos importados</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Cargando...</div>
        ) : importedProducts.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <span className="material-symbols-outlined text-4xl text-zinc-700 mb-2">inventory_2</span>
            <p>No hay productos importados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">Producto</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">Precio</th>
                  <th className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">Clicks</th>
                  <th className="py-3 px-4 text-right text-[10px] font-black uppercase text-zinc-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {importedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden">
                          {product.thumbnail ? (
                            <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-zinc-600">image</span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white line-clamp-1">{product.title}</p>
                          <p className="text-[10px] text-zinc-600">ML {product.ml_item_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-bold text-emerald-400">
                        ${product.price?.toLocaleString('es-AR')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-zinc-400">{product.clicks || 0}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}