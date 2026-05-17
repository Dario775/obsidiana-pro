'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';
import { useRouter } from 'next/navigation';
import { FeatureGate } from '@/components/feature-gate';

interface ProductData {
  id: string;
  nombre?: string;
  title?: string;
  slug: string;
  available_online: boolean;
  online_reserved: number;
  external_url?: string;
}

interface VariantData {
  id: string;
  sku: string;
  price_ars: number;
}

interface CatalogItem {
  id: string;
  variant_id: string;
  on_hand: number;
  committed: number;
  available: number;
  product: ProductData;
  variant: VariantData;
}

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
}

export default function OnlineCatalogPage() {
  const { tenant, hasFeature } = useTenant();
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOnline, setFilterOnline] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<OrderStats>({ totalOrders: 0, pendingOrders: 0, totalRevenue: 0 });
  
  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [scrapedData, setScrapedData] = useState<any>(null);
  const [importError, setImportError] = useState('');

  const [editFormData, setEditFormData] = useState({
    nombre: '',
    price: 0
  });

  // Helper to create affiliate URL if tenant settings are present
  const createAffiliateUrl = (originalUrl: string) => {
    if (!tenant) return originalUrl;
    
    // If it's already a short link or contains affiliate parameters, leave it
    if (originalUrl.includes('meli.la') || originalUrl.includes('matt_tool')) {
      return originalUrl;
    }

    // Only process Mercado Libre links
    if (!originalUrl.includes('mercadolibre.com')) {
      return originalUrl;
    }

    const ml_affiliate_id = (tenant as any).ml_affiliate_id;
    const ml_affiliate_word = (tenant as any).ml_affiliate_word;
    
    if (!ml_affiliate_id) return originalUrl;

    try {
      const url = new URL(originalUrl);
      url.searchParams.set('matt_tool', ml_affiliate_id);
      if (ml_affiliate_word) {
        url.searchParams.set('matt_word', ml_affiliate_word);
      }
      return url.toString();
    } catch {
      return originalUrl;
    }
  };

  useEffect(() => {
    if (tenant?.id) {
      fetchInventory();
      fetchOrderStats();
    }
  }, [tenant]);

  async function fetchInventory() {
    if (!tenant?.id) return;
    setLoading(true);
    
    // Fetch products with their variants and inventory
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('Error fetching products:', productsError);
    }

    // Get all variants for these products
    const productIds = products?.map(p => p.id).filter(Boolean) || [];
    
    let variants: any[] = [];
    if (productIds.length > 0) {
      const { data: variantData } = await supabase
        .from('product_variants')
        .select('id, sku, price_ars, product_id')
        .in('product_id', productIds)
        .order('sku');
      
      variants = variantData || [];
    }

    // Get inventory levels for these variants
    const variantIds = variants.map(v => v.id).filter(Boolean);
    let inventory: any[] = [];
    if (variantIds.length > 0) {
      const { data: invData } = await supabase
        .from('inventory_levels')
        .select('variant_id, on_hand, committed, available')
        .in('variant_id', variantIds);
      
      inventory = invData || [];
    }

    // Combine data
    const formatted: CatalogItem[] = [];
    for (const product of (products || [])) {
      const productVariants = variants.filter(v => v.product_id === product.id);
      
      for (const variant of productVariants) {
        const inv = inventory.find(i => i.variant_id === variant.id);
        
        formatted.push({
          id: variant.id,
          variant_id: variant.id,
          on_hand: inv?.on_hand || 0,
          committed: inv?.committed || 0,
          available: inv?.available || 0,
          product: {
            id: product.id,
            nombre: product.nombre,
            slug: product.slug,
            available_online: product.available_online,
            online_reserved: (product as any).online_reserved || 0,
            external_url: product.external_url || (product as any).seo?.ml_url || null,
          },
          variant: {
            id: variant.id,
            sku: variant.sku,
            price_ars: variant.price_ars,
          },
        });
      }
    }

    setItems(formatted);
    setLoading(false);
  }

  async function fetchOrderStats() {
    if (!tenant?.id) return;
    
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, total_ars')
      .eq('tenant_id', tenant.id)
      .in('status', ['pending', 'processing', 'shipped']);

    const { data: allOrders } = await supabase
      .from('orders')
      .select('id, total_ars')
      .eq('tenant_id', tenant.id)
      .in('status', ['completed', 'delivered']);

    const pendingCount = orders?.length || 0;
    const totalCount = (allOrders?.length || 0) + pendingCount;
    const revenue = (allOrders || []).reduce((sum, o) => sum + (o.total_ars || 0), 0);

    setStats({
      totalOrders: totalCount,
      pendingOrders: pendingCount,
      totalRevenue: revenue,
    });
  }

  async function toggleOnlineAvailability(item: CatalogItem) {
    setSaving(true);
    try {
      const newValue = !item.product.available_online;
      const { error } = await supabase
        .from('products')
        .update({ available_online: newValue })
        .eq('id', item.product.id);
      
      if (error) throw error;
      
      setItems(prev => prev.map(i => 
        i.id === item.id 
          ? { ...i, product: { ...i.product, available_online: newValue } }
          : i
      ));
    } catch (err: any) {
      console.error('Error:', err);
      alert('Error al actualizar: ' + err.message);
    }
    setSaving(false);
  }

  async function updateOnlineReserved(item: CatalogItem, value: number) {
    const newReserved = Math.max(0, Math.min(value, item.available));
    setSaving(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ online_reserved: newReserved })
        .eq('id', item.product.id);
      
      if (error) throw error;
      
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, product: { ...i.product, online_reserved: newReserved } } : i
      ));
    } catch (err: any) {
      console.error('Error:', err);
      alert('Error al actualizar: ' + err.message);
    }
    setSaving(false);
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      (item.product.nombre || item.product.title)?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      item.variant.sku?.toLowerCase()?.includes(searchQuery.toLowerCase());
    const matchesFilter = !filterOnline || 
      (filterOnline === 'online' && item.product.available_online) ||
      (filterOnline === 'offline' && !item.product.available_online);
    return matchesSearch && matchesFilter;
  });

  const publishedCount = items.filter(i => i.product.available_online).length;
  const totalStock = items.reduce((acc, i) => acc + (i.available || 0), 0);
  const totalOnlineReserved = items.reduce((acc, i) => acc + (i.product.online_reserved || 0), 0);

  // Extract ML item ID from various URL formats
  function extractMlItemId(url: string): string | null {
    // Format: MLA-1234567890 or MLA1234567890
    const patterns = [
      /MLA[-]?\d{8,12}/i,                              // Direct ML ID in URL
      /\/MLA[-]?\d{8,12}/i,                             // Path segment  
      /mercadolibre\.com\.ar\/[^\/]*-_JM#?/i,           // Product page URL
      /articulo\.mercadolibre\.com\.ar\/MLA[-]?(\d+)/i,  // Article page
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        // Normalize: ensure MLA format without dash
        const raw = match[0].replace(/^\//, '');
        return raw.replace(/^MLA-?/i, 'MLA').replace(/[^A-Z0-9]/gi, '');
      }
    }
    
    // Try extracting from /p/MLA... catalog URL format
    const catalogMatch = url.match(/\/p\/(MLA\d+)/i);
    if (catalogMatch) return catalogMatch[1] ?? null;
    
    return null;
  }

  // Resolve short URLs (meli.la, etc) using server-side endpoint to avoid CORS
  async function resolveShortUrl(url: string): Promise<string> {
    if (url.includes('meli.la') || url.includes('bit.ly') || url.includes('goo.gl')) {
      try {
        const resp = await fetch('/api/ml/resolve-url', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.url) return data.url;
        }
      } catch (e) {
        console.warn('Failed to resolve short URL:', e);
      }
    }
    return url;
  }

  async function handleAnalyze(manualUrl?: string) {
    const urlToUse = manualUrl || importUrl;
    if (!urlToUse) return;
    setAnalyzing(true);
    setImportError('');
    
    try {
      // Extract URL if pasted with text
      let targetUrl = urlToUse.trim();
      const urlMatch = targetUrl.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        targetUrl = urlMatch[0];
      }

      // Step 1: Resolve short URLs
      const resolvedUrl = await resolveShortUrl(targetUrl);
      
      // Step 2: Try ML Public API first (works from browser, bypasses Vercel IP block)
      const mlItemId = extractMlItemId(resolvedUrl) || extractMlItemId(targetUrl);
      
      if (mlItemId) {
        try {
          const apiRes = await fetch(`https://api.mercadolibre.com/items/${mlItemId}`);
          if (apiRes.ok) {
            const mlData = await apiRes.json();
            
            // Get best images
            const images = (mlData.pictures || [])
              .slice(0, 5)
              .map((p: any) => p.secure_url || p.url)
              .filter(Boolean);
            
            if (images.length === 0 && mlData.thumbnail) {
              // Use high-res version of thumbnail
              images.push(mlData.thumbnail.replace(/-I\.jpg/, '-O.jpg'));
            }

            const data = {
              title: mlData.title || '',
              description: '',
              price: mlData.price || 0,
              currency: mlData.currency_id || 'ARS',
              images,
              url: mlData.permalink || resolvedUrl
            };

            // Try to get description separately (optional)
            try {
              const descRes = await fetch(`https://api.mercadolibre.com/items/${mlItemId}/description`);
              if (descRes.ok) {
                const descData = await descRes.json();
                data.description = (descData.plain_text || descData.text || '').substring(0, 200);
              }
            } catch {}

            setScrapedData(data);
            setAnalyzing(false);
            return;
          }
        } catch (apiErr) {
          console.warn('ML API failed, falling back to scrape:', apiErr);
        }
      }

      // Step 3: Fallback to server-side scrape
      const response = await fetch('/api/ml/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: resolvedUrl || targetUrl })
      });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      setScrapedData(data);
    } catch (err: any) {
      setImportError(err.message || 'Error al analizar el link. Verificá que sea una URL válida de Mercado Libre.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImport() {
    if (!scrapedData || !tenant?.id) return;
    setSaving(true);
    try {
      const response = await fetch('/api/ml/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingItem ? 'update' : 'insert',
          scrapedData,
          tenantId: tenant.id,
          importUrl,
          editingItem
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al procesar la solicitud');
      }

      alert(editingItem ? 'Producto actualizado exitosamente' : 'Producto importado exitosamente');

      setShowImportModal(false);
      setScrapedData(null);
      setImportUrl('');
      setEditingItem(null);
      fetchInventory();
    } catch (err: any) {
      alert('Error al procesar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }


  async function handleDeleteProduct(item: CatalogItem) {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto del catálogo? Esta acción no se puede deshacer.')) return;
    setSaving(true);
    try {
      // Delete in correct order for FK constraints
      await supabase.from('inventory_levels').delete().eq('variant_id', item.variant.id);
      await supabase.from('product_variants').delete().eq('id', item.variant.id);
      const { error } = await supabase.from('products').delete().eq('id', item.product.id);
      
      if (error) throw error;
      fetchInventory();
      alert('Producto eliminado exitosamente');
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <FeatureGate feature="online_store">
      <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Catálogo Web</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Controlá qué productos se venden en tu tienda online
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasFeature('ml_sync') ? (
            <button 
              onClick={() => setShowImportModal(true)}
              className="bg-[#FFE600] text-black px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-[#FFE600]/90 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,230,0,0.1)]"
            >
              <span className="material-symbols-outlined text-[18px] font-black">add_shopping_cart</span>
              Importar de Mercado Libre
            </button>
          ) : (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Sincronización ML</span>
              <span className="text-[9px] text-amber-500/50 font-bold italic">No incluida en tu plan</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-zinc-600 text-[18px]">inventory_2</span>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Publicados</p>
          </div>
          <p className="text-2xl font-black text-white">{publishedCount}</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-zinc-600 text-[18px]">inventory</span>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Stock Total</p>
          </div>
          <p className="text-2xl font-black text-white">{totalStock}</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-zinc-600 text-[18px]">shopping_cart</span>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Reservado Web</p>
          </div>
          <p className="text-2xl font-black text-amber-400">{totalOnlineReserved}</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-zinc-600 text-[18px]">point_of_sale</span>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Disp. POS</p>
          </div>
          <p className="text-2xl font-black text-emerald-400">{totalStock - totalOnlineReserved}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[18px]">search</span>
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
        </div>
        <select 
          value={filterOnline}
          onChange={(e) => setFilterOnline(e.target.value)}
          className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        >
          <option value="">Todos los productos</option>
          <option value="online">Publicados</option>
          <option value="offline">No publicados</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1E1E1E]/50 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                <th className="py-4 px-6">Producto</th>
                <th className="py-4 px-6">SKU</th>
                <th className="py-4 px-6 text-right">Stock Disp.</th>
                <th className="py-4 px-6 text-right">Reservado Web</th>
                <th className="py-4 px-6 text-right">Precio</th>
                <th className="py-4 px-6 text-center">Tienda Online</th>
                <th className="py-4 px-6 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-zinc-500 font-black uppercase">
                    Cargando...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-zinc-500 font-black uppercase">
                    {searchQuery ? 'No se encontraron productos' : 'No hay productos en el inventario'}
                  </td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6">
                    <p className="font-bold text-sm text-white">{item.product.nombre || item.product.title}</p>
                  </td>
                  <td className="py-4 px-6 text-zinc-400 text-xs font-mono">
                    {item.variant.sku}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`font-black text-lg ${item.available > 10 ? 'text-emerald-400' : item.available > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                        {item.available}
                      </span>
                      {item.product.online_reserved > 0 && (
                        <span className="text-[10px] text-amber-400">
                          ({item.product.online_reserved} web)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <input
                      type="number"
                      min="0"
                      max={item.available}
                      value={item.product.online_reserved || 0}
                      onChange={(e) => updateOnlineReserved(item, parseInt(e.target.value) || 0)}
                      disabled={saving}
                      className="w-20 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-right text-white text-sm font-bold disabled:opacity-50"
                    />
                    <span className="block text-[10px] text-zinc-500 mt-1">
                      {item.product.available_online 
                        ? `${Math.max(0, item.available - (item.product.online_reserved || 0))} para POS`
                        : 'No publicado'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right text-white font-bold">
                    ${((item.variant.price_ars || 0)).toLocaleString('es-AR')}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => toggleOnlineAvailability(item)}
                      disabled={saving}
                      className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors ${
                        item.product.available_online 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
                          : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/30 hover:bg-zinc-800'
                      }`}
                    >
                      {item.product.available_online ? 'Publicado' : 'Publicar'}
                    </button>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          if (item.product.external_url) {
                            setEditingItem(item);
                            setImportUrl(item.product.external_url);
                            setScrapedData(null); // Clear previous data so they see the "Analyze" button
                            setShowImportModal(true);
                          } else {
                            router.push(`/inventory?product=${item.product.id}`);
                          }
                        }}
                        className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white"
                        title={item.product.external_url ? 'Verificar y Actualizar ML' : 'Editar en Inventario'}
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(item)}
                        className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-red-400"
                        title="Eliminar producto"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-violet-400">info</span>
          <div>
            <p className="text-sm font-bold text-white">Gestión de Catálogo Híbrido</p>
            <p className="text-xs text-zinc-400 mt-1">
              Podés publicar productos de tu inventario local o <strong>Importar de Mercado Libre</strong> para vender como afiliado. 
              Usa el botón amarillo superior para agregar productos externos rápidamente pegando solo el link.
            </p>
          </div>
        </div>
      </div>
      {/* Import/Edit Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-6xl bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-500 flex flex-col h-[85vh]">
            {/* Header - Browser Style */}
            <div className="bg-[#111] px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>
                <span className="ml-4 text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                  {editingItem ? 'Verification & Sync Engine' : 'Live Import Engine & Verification'}
                </span>
              </div>
              <button onClick={() => { setShowImportModal(false); setScrapedData(null); setEditingItem(null); setImportUrl(''); }} className="text-zinc-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left Side: Data Panel */}
              <div className="w-[380px] border-r border-white/5 p-8 overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
                {!scrapedData ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-violet-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">link</span> URL o Texto del Producto
                      </label>
                      <input 
                        type="text" 
                        placeholder="Pegá el link o el texto de ML aquí..."
                        className="w-full bg-[#111] border border-white/5 rounded-2xl px-6 py-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-all text-sm"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        disabled={!!editingItem}
                      />
                    </div>
                    
                    {importError && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <p className="text-xs text-red-400 font-bold">{importError}</p>
                      </div>
                    )}

                    <button 
                      onClick={() => handleAnalyze()}
                      disabled={analyzing || !importUrl}
                      className="w-full py-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.5)] transition-all disabled:opacity-50"
                    >
                      {analyzing ? 'Procesando...' : (editingItem ? 'Re-Analizar Link' : 'Analizar Producto')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-left duration-500">
                    <div className="space-y-6">
                      <div className="aspect-square rounded-2xl bg-[#111] border border-white/5 overflow-hidden">
                        {scrapedData.images?.[0] && (
                          <img src={scrapedData.images[0]} className="w-full h-full object-cover" />
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Título</label>
                          <input 
                            type="text" 
                            value={scrapedData.title}
                            onChange={(e) => setScrapedData({...scrapedData, title: e.target.value})}
                            className="w-full bg-transparent border-b border-white/5 text-white font-black text-sm focus:outline-none focus:border-violet-500 py-1"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">payments</span> Precio Final en Tienda
                          </label>
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50 font-black text-xl">$</div>
                            <input 
                              type="text" 
                              value={scrapedData.price}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                setScrapedData({...scrapedData, price: val ? parseFloat(val) : 0});
                              }}
                              className="w-full bg-[#111] border border-white/5 rounded-2xl pl-10 pr-4 py-5 text-emerald-400 font-black text-3xl focus:outline-none focus:border-emerald-500/50 transition-all"
                            />
                          </div>
                          <p className="text-[9px] text-zinc-600 font-medium italic">Velo a la derecha y corregilo acá si hace falta.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => setScrapedData(null)}
                        className="flex-1 py-4 bg-zinc-900 text-zinc-500 rounded-xl font-bold uppercase tracking-widest text-[9px] hover:text-white transition-all"
                      >
                        Volver
                      </button>
                      <button 
                        onClick={handleImport}
                        disabled={saving}
                        className={`flex-[2] py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-lg ${editingItem ? 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'} text-white`}
                      >
                        {saving ? 'Procesando...' : (editingItem ? 'Sincronizar y Guardar' : 'Confirmar e Importar')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Live View / Iframe */}
              <div className="flex-1 bg-white relative group">
                {importUrl && (importUrl.startsWith('http') || importUrl.includes('meli.la')) ? (
                  <iframe 
                    src={`/api/proxy?url=${encodeURIComponent(importUrl.match(/https?:\/\/[^\s]+/)?.[0] || importUrl)}`}
                    className="w-full h-full border-none"
                    title="Mercado Libre Live View"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] text-zinc-700">
                    <span className="material-symbols-outlined text-6xl mb-4 opacity-20">language</span>
                    <p className="text-xs font-bold uppercase tracking-[0.3em]">Esperando URL de Producto</p>
                  </div>
                )}
                
                {/* Overlay Hint */}
                <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-[9px] font-black text-white uppercase tracking-widest">Vista en Vivo (Verificá el precio aquí)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </FeatureGate>
  );
}
