'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';
import Link from 'next/link';

interface Variant {
  id: string;
  sku: string;
  price_ars: number;
  on_hand: number;
  variant_options?: Record<string, string>;
  products: {
    id: string;
    nombre: string;
    images?: string[];
  } | null;
}

interface TopProduct {
  name: string;
  sku: string;
  salesCount: number;
}

export default function InventoryAnalyticsPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all product variants with their stock levels to calculate assets and low stock
      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select(`
          id,
          sku,
          price_ars,
          variant_options,
          products (
            id,
            nombre,
            images
          ),
          inventory_levels (
            on_hand
          )
        `)
        .eq('tenant_id', tenant.id);

      if (variantsError) throw variantsError;

      // Map to flatten structure
      const mappedVariants: Variant[] = (variantsData || []).map((v: any) => {
        const onHand = v.inventory_levels?.[0]?.on_hand || 0;
        return {
          id: v.id,
          sku: v.sku,
          price_ars: v.price_ars || 0,
          on_hand: onHand,
          variant_options: v.variant_options,
          products: v.products
        };
      });

      setVariants(mappedVariants);

      // 2. Fetch inventory transactions where reason is 'sale' to calculate top selling products
      const { data: txsData, error: txsError } = await supabase
        .from('inventory_transactions')
        .select(`
          quantity_changed,
          product_variants (
            sku,
            products (
              nombre
            )
          )
        `)
        .eq('tenant_id', tenant.id)
        .eq('reason', 'sale');

      if (txsError) throw txsError;

      // Aggregate sales
      const salesMap: Record<string, { name: string; sku: string; count: number }> = {};
      (txsData || []).forEach((tx: any) => {
        const variant = tx.product_variants;
        const productName = variant?.products?.nombre || 'Producto';
        const sku = variant?.sku || 'S/N';
        const count = Math.abs(tx.quantity_changed); // Quantity changed is negative for sales

        const key = `${productName}-${sku}`;
        if (!salesMap[key]) {
          salesMap[key] = { name: productName, sku, count: 0 };
        }
        salesMap[key].count += count;
      });

      // Sort and take top 5
      const sortedTop: TopProduct[] = Object.values(salesMap)
        .map((item) => ({
          name: item.name,
          sku: item.sku,
          salesCount: item.count
        }))
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 5);

      setTopProducts(sortedTop);

    } catch (err: any) {
      console.error('Error loading inventory analytics:', err);
      setError(err.message || 'Error al compilar el análisis del inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [tenant?.id]);

  // Calculations
  const totalUnits = variants.reduce((acc, curr) => acc + curr.on_hand, 0);
  
  const totalValuation = variants.reduce((acc, curr) => {
    // Avoid double counting negative or zero stock in financial valuation
    const stock = Math.max(0, curr.on_hand);
    return acc + (stock * curr.price_ars);
  }, 0);

  const outOfStockCount = variants.filter((v) => v.on_hand <= 0).length;
  const lowStockCount = variants.filter((v) => v.on_hand > 0 && v.on_hand <= 5).length;
  const stockoutRate = variants.length > 0 ? (outOfStockCount / variants.length) * 100 : 0;

  // Replenishment items list (low stock)
  const criticalItems = variants
    .filter((v) => v.on_hand <= 5)
    .sort((a, b) => a.on_hand - b.on_hand)
    .slice(0, 5);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (tenantLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-zinc-950 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500"></div>
        <span className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.3em]">Cargando tienda...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-8 font-inter">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-violet-400 dark:to-fuchsia-400 leading-none">
              Análisis de Inventario
            </h1>
            <p className="text-zinc-400 text-sm mt-2">
              Auditoría de activos contables, análisis de rotación e indicadores críticos de stock.
            </p>
          </div>
          
          <button 
            onClick={fetchAnalyticsData}
            className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Recalcular Métricas
          </button>
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            <p className="text-xs text-zinc-500 font-semibold tracking-wider uppercase">Analizando catálogo...</p>
          </div>
        ) : error ? (
          <div className="py-20 text-center text-red-400 border border-white/5 bg-zinc-900/40 rounded-2xl p-6">
            <span className="material-symbols-outlined text-4xl mb-2">warning</span>
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Asset Valuation */}
              <div className="bg-zinc-900/60 border border-white/5 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group hover:border-violet-500/20 transition-colors shadow-lg">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-violet-600/10 to-transparent rounded-full blur-xl"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Valoración Activa</span>
                  <span className="p-2 bg-violet-500/10 text-violet-400 rounded-xl">
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                  </span>
                </div>
                <h3 className="text-2xl font-black tracking-tight">{formatCurrency(totalValuation)}</h3>
                <p className="text-zinc-500 text-xs mt-1">Capital inmovilizado en stock</p>
              </div>

              {/* Total Units */}
              <div className="bg-zinc-900/60 border border-white/5 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/20 transition-colors shadow-lg">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-600/10 to-transparent rounded-full blur-xl"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Unidades Físicas</span>
                  <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                    <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                  </span>
                </div>
                <h3 className="text-2xl font-black tracking-tight">{totalUnits} uds</h3>
                <p className="text-zinc-500 text-xs mt-1">Suma de existencias totales</p>
              </div>

              {/* Out of stock (Ruptura) */}
              <div className="bg-zinc-900/60 border border-white/5 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group hover:border-red-500/20 transition-colors shadow-lg">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-600/10 to-transparent rounded-full blur-xl"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Rupturas de Stock</span>
                  <span className="p-2 bg-red-500/10 text-red-400 rounded-xl">
                    <span className="material-symbols-outlined text-[20px]">report</span>
                  </span>
                </div>
                <h3 className="text-2xl font-black tracking-tight">{outOfStockCount} productos</h3>
                <p className="text-zinc-500 text-xs mt-1">Agotados ({stockoutRate.toFixed(1)}% del catálogo)</p>
              </div>

              {/* Low stock alerts */}
              <div className="bg-zinc-900/60 border border-white/5 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/20 transition-colors shadow-lg">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-600/10 to-transparent rounded-full blur-xl"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Alertas de Stock</span>
                  <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                  </span>
                </div>
                <h3 className="text-2xl font-black tracking-tight">{lowStockCount} alertas</h3>
                <p className="text-zinc-500 text-xs mt-1">Nivel crítico (5 unidades o menos)</p>
              </div>

            </div>

            {/* Charts & Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Top Selling products (7 cols) */}
              <div className="bg-zinc-900/60 border border-white/5 backdrop-blur-md rounded-2xl p-6 lg:col-span-7 flex flex-col space-y-6">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">Top 5 Productos más Vendidos</h3>
                  <p className="text-zinc-500 text-xs mt-1">Productos con mayor cantidad de unidades vendidas acumuladas en la terminal POS.</p>
                </div>
                
                {topProducts.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 py-12 border border-dashed border-white/5 rounded-xl bg-zinc-950/20 space-y-3">
                    <span className="material-symbols-outlined text-3xl text-zinc-600">bar_chart</span>
                    <div>
                      <p className="text-xs font-bold text-white">Sin datos de venta suficientes</p>
                      <p className="text-[11px] text-zinc-500 max-w-sm mt-0.5">Realizá ventas en tu Terminal POS para comenzar a trazar las estadísticas financieras.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col gap-6 justify-center">
                    {topProducts.map((prod, idx) => {
                      // Percentage calculation based on highest sales count
                      const maxCount = topProducts[0]?.salesCount || 1;
                      const percentage = (prod.salesCount / maxCount) * 100;
                      
                      return (
                        <div key={idx} className="space-y-2">
                          <div className="flex justify-between items-end text-xs">
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-white truncate max-w-[280px]">{prod.name}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">SKU: {prod.sku}</span>
                            </div>
                            <span className="font-mono font-black text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/15">{prod.salesCount} uds</span>
                          </div>
                          
                          {/* Progress Bar Container */}
                          <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Urgent Replenishment Alerts (5 cols) */}
              <div className="bg-zinc-900/60 border border-white/5 backdrop-blur-md rounded-2xl p-6 lg:col-span-5 flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white">Reposición Urgente</h3>
                    <p className="text-zinc-500 text-xs mt-1">Variantes con stock nulo o críticamente bajo que requieren reordenarse.</p>
                  </div>

                  {criticalItems.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-white/5 rounded-xl bg-zinc-950/20 flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-3xl text-emerald-500 bg-emerald-500/10 p-2.5 rounded-full border border-emerald-500/20">check_circle</span>
                      <p className="text-xs font-bold text-white">Stock 100% Salusable</p>
                      <p className="text-[11px] text-zinc-500 max-w-[200px]">Ningún producto se encuentra por debajo del nivel mínimo.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-white/5">
                      {criticalItems.map((item, idx) => {
                        const product = item.products;
                        const isZero = item.on_hand <= 0;
                        
                        return (
                          <li key={item.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0 group">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden bg-cover bg-center"
                                style={{ 
                                  backgroundImage: product?.images && product.images.length > 0 && product.images[0]
                                    ? `url(${product.images[0]})`
                                    : 'none'
                                }}
                              >
                                {!product?.images?.[0] && (
                                  <span className="material-symbols-outlined text-zinc-500 text-[16px]">image</span>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-white truncate max-w-[140px] group-hover:text-violet-400 transition-colors">
                                  {product?.nombre || 'Producto'}
                                </span>
                                <span className="text-[9px] font-mono text-zinc-500">
                                  {item.sku || 'Sin SKU'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                isZero 
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {isZero ? 'Agotado' : `${item.on_hand} uds`}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/5">
                  <Link 
                    href="/inventory"
                    className="w-full flex items-center justify-center gap-1.5 bg-zinc-950 border border-white/10 hover:bg-zinc-900 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors active:scale-98"
                  >
                    <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                    Gestionar Inventario Completo
                  </Link>
                </div>
              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
}
