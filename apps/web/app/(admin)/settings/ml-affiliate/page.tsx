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
    try {
      const response = await fetch('/api/ml/config');
      if (response.ok) {
        const data = await response.json();
        setPlatformConfig({
          app_client_id: data.app_client_id || '',
          app_redirect_uri: data.app_redirect_uri || '',
        });
      }
    } catch (error) {
      console.error('Error loading ML config:', error);
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
    const { data } = await supabase
      .from('tenants')
      .select('ml_affiliate_id, ml_token_expires_at')
      .eq('id', tenant?.id)
      .single();

    // In a real scenario, you might want to store ml_affiliate_word in metadata or a separate column
    // For now we'll use a hidden part of ml_affiliate_id or just assume it's one field
    // Actually, let's check if we have the column. If not, we'll just use ml_affiliate_id.

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

    try {
      const response = await fetch('/api/ml/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          ml_affiliate_id: form.ml_affiliate_id,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      alert('Configuración guardada');
    } catch (error) {
      console.error('Save error:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
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
    console.log('--- connectWithML triggered ---');
    
    if (!form.ml_affiliate_id) {
      alert('Por favor, ingresa primero tu ID de Afiliado y guárdalo.');
      return;
    }

    if (!platformConfig?.app_client_id || !platformConfig?.app_redirect_uri) {
      alert('Configuración de ML no disponible. Contacta al administrador.');
      return;
    }

    if (!tenant?.id) {
      alert('Error: ID de tienda no encontrado');
      return;
    }

    // PKCE Implementation required by Mercado Libre
    const generateRandomString = (length: number) => {
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      let result = '';
      const values = new Uint8Array(length);
      window.crypto.getRandomValues(values);
      for (let i = 0; i < length; i++) {
        const index = (values[i] ?? 0) % charset.length;
        result += charset[index];
      }
      return result;
    };

    const verifier = generateRandomString(128);
    localStorage.setItem('ml_code_verifier', verifier);

    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashString = String.fromCharCode.apply(null, hashArray);
    const base64Hash = btoa(hashString);
    const challenge = base64Hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const redirectUri = platformConfig.app_redirect_uri;
    const authUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${platformConfig.app_client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${tenant.id}&code_challenge=${challenge}&code_challenge_method=S256`;
    
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

    setSearching(true);
    try {
      // 1. Obtener el site_id (intentamos MLA por defecto o el que tenga la cuenta)
      let siteId = 'MLA';
      
      // Intentamos obtener el site_id real de la cuenta conectada si existe
      try {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('ml_access_token')
          .eq('id', tenant?.id)
          .single();
        
        if (tenantData?.ml_access_token) {
          const userRes = await fetch('https://api.mercadolibre.com/users/me', {
            headers: { 'Authorization': `Bearer ${tenantData.ml_access_token}` }
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            siteId = userData.site_id || 'MLA';
          }
        }
      } catch (e) {
        console.warn('Usando site_id por defecto (MLA)');
      }

      // 2. Búsqueda DIRECTA desde el navegador (evita bloqueo de IP de Vercel)
      // Añadimos el client_id a la búsqueda pública para identificarnos ante ML
      const clientIdParam = platformConfig?.app_client_id ? `&client_id=${platformConfig.app_client_id}` : '';
      const response = await fetch(`https://api.mercadolibre.com/sites/${siteId}/search?q=${encodeURIComponent(searchQuery)}&limit=20${clientIdParam}`);
      
      if (!response.ok) {
        throw new Error(`Error de Mercado Libre: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(data.results || []);

      if (data.results?.length === 0) {
        alert('No se encontraron productos para esa búsqueda.');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      alert('Error al buscar productos. Intenta de nuevo.\n\nDetalles: ' + (error.message || String(error)));
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

      {/* Config Card */}
      <div className="bg-zinc-900 border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none group-hover:bg-amber-500/10 transition-all duration-1000"></div>
          
          <div className="relative z-10">
            <h2 className="text-xl font-black text-white tracking-tight uppercase tracking-[0.1em] mb-2">Configuración de Afiliado</h2>
            <p className="text-sm text-zinc-500 mb-8 max-w-xl">
              Vincula tu tienda con Mercado Libre para habilitar la importación de productos y el sistema de comisiones.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3">ID de Afiliado (MATT_TOOL)</label>
                  <input
                    type="text"
                    value={form.ml_affiliate_id}
                    onChange={(e) => setForm({ ...form, ml_affiliate_id: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3.5 text-white font-data-tabular focus:border-amber-500/50 focus:outline-none transition-all placeholder:text-zinc-800"
                    placeholder="Ej: 27967988"
                  />
                  <p className="text-[10px] text-zinc-700 mt-2 italic font-medium">Este ID es necesario para que las ventas se atribuyan a tu cuenta.</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={saveConfig}
                    disabled={saving}
                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    {saving ? 'Guardando...' : 'Guardar ID de Afiliado'}
                  </button>
                </div>
              </div>

              <div className="bg-zinc-950/50 rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center text-center">
                <div className={`w-16 h-16 rounded-full mb-4 flex items-center justify-center border-2 ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'}`}>
                  <span className="material-symbols-outlined text-3xl">
                    {isConnected ? 'check_circle' : 'cloud_sync'}
                  </span>
                </div>
                
                <h3 className="text-white font-black text-sm uppercase tracking-widest mb-1">
                  {isConnected ? 'Tienda Conectada' : 'Autorización de App'}
                </h3>
                <p className="text-zinc-600 text-[11px] mb-6 px-4">
                  {isConnected 
                    ? `Autorización válida hasta: ${new Date(connectionStatus.expiresAt!).toLocaleDateString('es-AR')}`
                    : 'Debes autorizar nuestra App para sincronizar tus productos de Mercado Libre.'}
                </p>

                {!isConnected ? (
                  <button
                    type="button"
                    onClick={connectWithML}
                    disabled={!platformConfig || !tenant?.id || !form.ml_affiliate_id}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
                  >
                    <span className="material-symbols-outlined text-[18px]">vpn_key</span>
                    Autorizar Conexión
                  </button>
                ) : (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={refreshToken}
                      className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-xs transition-all"
                    >
                      Refrescar
                    </button>
                    <button
                      onClick={disconnect}
                      className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold text-xs transition-all"
                    >
                      Desvincular
                    </button>
                  </div>
                )}
              </div>
            </div>
        </div>
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

      {/* Search & Manual Import */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white">Importar Productos</h2>
          <div className="flex gap-2">
             <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold rounded uppercase">Buscador Bloqueado por ML</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Opción 1: Buscador (Sigue con 403 en algunos casos) */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">Opción A: Buscador de Catálogo</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchMLProducts()}
                placeholder="Ej: Smart TV 50..."
                className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none"
              />
              <button
                onClick={searchMLProducts}
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {searching ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : 'Buscar'}
              </button>
            </div>
          </div>

          {/* Opción 2: Importación Directa (MÁS ROBUSTA) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">Opción B: Importar por Link o ID (Recomendado)</label>
              <button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch(`https://api.mercadolibre.com/items/MLA1136423376`);
                    if (!res.ok) throw new Error('Error al conectar con ML');
                    const product = await res.json();
                    setSearchResults([product]);
                    setSelectedIds([product.id]);
                  } catch (e: any) {
                    alert('Error en prueba: ' + e.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-[10px] text-amber-500 font-bold hover:underline"
              >
                Cargar Producto de Prueba
              </button>
            </div>
            <div className="flex gap-2">
              <input
                id="manual_import_input"
                type="text"
                placeholder="Pega el link de ML o ID (MLA123...)"
                className="flex-1 bg-zinc-950 border border-amber-500/20 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50"
              />
              <button
                onClick={async () => {
                  const input = (document.getElementById('manual_import_input') as HTMLInputElement);
                  const val = input.value.trim();
                  if (!val) return;
                  
                  // Regex para capturar TODOS los posibles IDs en el link
                  const regex = /([A-Z]{2,3})[-]?([0-9]{5,15})/gi;
                  const matches = Array.from(val.matchAll(regex));
                  
                  if (matches.length === 0) {
                    alert('No se reconoció ningún ID en el link. Pega la URL completa de Mercado Libre.');
                    return;
                  }

                  setLoading(true);
                  let success = false;
                  
                  // Probamos cada ID encontrado en el link
                  for (const match of matches) {
                    const id = match[1].toUpperCase() + match[2];
                    
                    try {
                      // Intento 1: Como ITEM (Publicación normal)
                      let res = await fetch(`https://api.mercadolibre.com/items/${id}`);
                      
                      // Intento 2: Como PRODUCTO (Catálogo /p/) si el anterior falló
                      if (!res.ok) {
                        res = await fetch(`https://api.mercadolibre.com/products/${id}`);
                      }

                      if (res.ok) {
                        const product = await res.json();
                        setSearchResults([product]);
                        setSelectedIds([product.id]);
                        input.value = '';
                        success = true;
                        break; // ¡Encontrado!
                      }
                    } catch (e) {
                      continue; // Probar el siguiente ID
                    }
                  }

                  if (!success) {
                    alert('No pudimos encontrar el producto con ese link. Asegúrate de que sea un producto activo en Mercado Libre.');
                  }
                  setLoading(false);
                }}
                className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold transition-all"
              >
                Cargar
              </button>
            </div>
          </div>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-zinc-400">{searchResults.length} resultados encontrados</p>
              <button
                onClick={importSelectedProducts}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold text-sm disabled:opacity-50"
              >
                Importar a Mi Tienda ({selectedIds.length})
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
                    <img src={product.pictures?.[0]?.url || product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2">
                    <p className="text-[10px] text-zinc-500 mb-1">{product.id}</p>
                    <p className="text-xs text-white line-clamp-2 leading-tight">{product.title}</p>
                    <p className="text-sm font-bold text-amber-400 mt-1">
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