'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';
import { useRouter } from 'next/navigation';

interface ProductData {
  id: string;
  title: string;
  slug: string;
  available_online: boolean;
  online_reserved: number;
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
  const { tenant } = useTenant();
  const router = useRouter();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOnline, setFilterOnline] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<OrderStats>({ totalOrders: 0, pendingOrders: 0, totalRevenue: 0 });

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
      .select('id, title, slug, available_online, online_reserved, tenant_id')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .order('title');

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
            title: product.title,
            slug: product.slug,
            available_online: product.available_online,
            online_reserved: product.online_reserved,
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
      .select('id, status, total')
      .eq('tenant_id', tenant.id)
      .in('status', ['pending', 'processing', 'shipped']);

    const { data: allOrders } = await supabase
      .from('orders')
      .select('id, total')
      .eq('tenant_id', tenant.id)
      .in('status', ['completed', 'delivered']);

    const pendingCount = orders?.length || 0;
    const totalCount = (allOrders?.length || 0) + pendingCount;
    const revenue = (allOrders || []).reduce((sum, o) => sum + (o.total || 0), 0);

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
      item.product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.variant.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = !filterOnline || 
      (filterOnline === 'online' && item.product.available_online) ||
      (filterOnline === 'offline' && !item.product.available_online);
    return matchesSearch && matchesFilter;
  });

  const publishedCount = items.filter(i => i.product.available_online).length;
  const totalStock = items.reduce((acc, i) => acc + (i.available || 0), 0);
  const totalOnlineReserved = items.reduce((acc, i) => acc + (i.product.online_reserved || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Catálogo Web</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Controlá qué productos se venden en tu tienda online
          </p>
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
                    <p className="font-bold text-sm text-white">{item.product.title}</p>
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
                        onClick={() => router.push(`/inventory?product=${item.product.id}`)}
                        className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
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
            <p className="text-sm font-bold text-white">¿Cómo funciona?</p>
            <p className="text-xs text-zinc-400 mt-1">
              Seleccioná <strong>"Publicar"</strong> para mostrar un producto en tu tienda online. 
              El campo <strong>"Reservado Web"</strong> te permite indicar cuántas unidades se reservan exclusivamente para ventas online, 
              evitando que se venda más stock del disponible en la tienda física.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
