'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

interface MLProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  thumbnail: string;
  pictures: string[];
  condition: string;
  listing_type_id: string;
  category_id: string;
  permalink: string;
}

interface ImportedProduct {
  id: string;
  ml_item_id: string;
  title: string;
  price: number;
  currency: string;
  thumbnail: string;
  affiliate_url: string;
  clicks: number;
  imported_at: string;
}

export default function MLProductsPage() {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MLProduct[]>([]);
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [configStatus, setConfigStatus] = useState<'loading' | 'missing' | 'configured'>('loading');

  const [tenantAffiliateId, setTenantAffiliateId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (tenant?.id) {
      loadConfig();
      loadImportedProducts();
    }
  }, [tenant?.id]);

  async function loadConfig() {
    const { data } = await supabase
      .from('tenants')
      .select('ml_affiliate_id, ml_token_expires_at')
      .eq('id', tenant?.id)
      .single();

    if (data?.ml_affiliate_id) {
      setTenantAffiliateId(data.ml_affiliate_id);
      setConfigStatus('configured');
      
      // Check connection status from token expiry (without exposing actual token)
      const hasToken = !!data.ml_token_expires_at;
      const isExpired = data.ml_token_expires_at 
        ? new Date(data.ml_token_expires_at) <= new Date() 
        : true;
      setIsConnected(hasToken && !isExpired);
    } else {
      setConfigStatus('missing');
    }
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
      alert('Conecta con Mercado Libre primero desde ML Afiliado.');
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
          setIsConnected(false);
          alert('Sesión expirada. Reconecta desde ML Afiliado.');
        } else {
          alert(data.error || 'Error en la búsqueda');
        }
        return;
      }

      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      alert('Error al buscar productos');
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
    if (!tenant?.id || !tenantAffiliateId || selectedIds.length === 0) return;

    setLoading(true);

    try {
      for (const productId of selectedIds) {
        const product = searchResults.find(p => p.id === productId);
        if (!product) continue;

        // Get first image for thumbnail
        const thumbnail = product.pictures?.[0] || product.thumbnail;

        // Insert into database
        await supabase.from('ml_products').upsert({
          tenant_id: tenant.id,
          ml_item_id: product.id,
          title: product.title,
          price: product.price,
          currency: product.currency,
          thumbnail: thumbnail,
          pictures: product.pictures,
          condition: product.condition,
          listing_type_id: product.listing_type_id,
          category_id: product.category_id,
          permalink: product.permalink,
          affiliate_url: '', // Generated dynamically on the store
          clicks: 0,
        }, {
          onConflict: 'tenant_id,ml_item_id',
        });
      }

      setSelectedIds([]);
      setSearchResults([]);
      setSearchQuery('');
      await loadImportedProducts();
      alert(`${selectedIds.length} producto(s) importado(s)`);
    } catch (error) {
      console.error('Import error:', error);
      alert('Error al importar productos');
    } finally {
      setLoading(false);
    }
  }

  async function removeProduct(productId: string) {
    if (!confirm('¿Eliminar este producto de tu tienda?')) return;

    await supabase
      .from('ml_products')
      .delete()
      .eq('id', productId);

    await loadImportedProducts();
  }

  if (configStatus === 'loading') {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-zinc-500">Cargando...</div>
      </div>
    );
  }

  if (configStatus === 'missing') {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-8">
          <span className="material-symbols-outlined text-6xl text-amber-400 mb-4">shopping_cart</span>
          <h1 className="text-2xl font-black text-white mb-2">Mercado Libre Afiliados</h1>
          <p className="text-zinc-400 mb-4">
            Configura tu ID de afiliado primero para importar productos de Mercado Libre.
          </p>
          <a
            href="/settings/ml-affiliate"
            className="inline-block px-6 py-3 bg-amber-500 text-white rounded-xl font-bold"
          >
            Ir a ML Afiliado
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Productos ML</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Importa productos de Mercado Libre a tu tienda
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-400 font-bold">
            ID: {tenantAffiliateId}
          </span>
          {!isConnected && (
            <span className="text-xs text-red-400 font-bold ml-2">
              (Desconectado)
            </span>
          )}
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-6">
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
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-bold disabled:opacity-50 flex items-center gap-2"
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
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
          <h2 className="text-lg font-black text-white">Productos Importados</h2>
          <p className="text-xs text-zinc-500">{importedProducts.length} productos en tu tienda</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Cargando...</div>
        ) : importedProducts.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <span className="material-symbols-outlined text-4xl text-zinc-700 mb-2">inventory_2</span>
            <p>No hay productos importados</p>
            <p className="text-xs text-zinc-600 mt-1">Busca y selecciona productos de ML</p>
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