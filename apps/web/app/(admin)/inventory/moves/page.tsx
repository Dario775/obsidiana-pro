'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

interface Movement {
  id: string;
  quantity_changed: number;
  reason: 'sale' | 'adjustment' | 'purchase' | 'loss';
  created_at: string;
  created_by: string | null;
  product_variants: {
    id: string;
    sku: string;
    price_ars: number;
    variant_options?: Record<string, string>;
    products: {
      id: string;
      nombre: string;
      title?: string;
      images?: string[];
    };
  } | null;
}

export default function InventoryMovesPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReason, setSelectedReason] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchMovements = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('inventory_transactions')
        .select(`
          id,
          quantity_changed,
          reason,
          created_at,
          created_by,
          product_variants (
            id,
            sku,
            price_ars,
            variant_options,
            products (
              id,
              nombre,
              images
            )
          )
        `)
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMovements((data as any) || []);
    } catch (err: any) {
      console.error('Error loading inventory transactions:', err);
      setError(err.message || 'Error al cargar los movimientos de inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [tenant?.id]);

  // Filter Logic
  const filteredMovements = movements.filter((move) => {
    // 1. Search term match (SKU, product name)
    const variant = move.product_variants;
    const productName = variant?.products?.nombre || '';
    const sku = variant?.sku || '';
    const matchesSearch = 
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Reason match
    const matchesReason = selectedReason === 'all' || move.reason === selectedReason;

    // 3. Date range match
    let matchesDates = true;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchesDates = matchesDates && new Date(move.created_at) >= start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDates = matchesDates && new Date(move.created_at) <= end;
    }

    return matchesSearch && matchesReason && matchesDates;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
  const paginatedMovements = filteredMovements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getReasonBadge = (reason: string) => {
    let bg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    let text = 'Compra';
    let icon = 'add_shopping_cart';

    if (reason === 'sale') {
      bg = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      text = 'Venta POS';
      icon = 'point_of_sale';
    } else if (reason === 'adjustment') {
      bg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      text = 'Ajuste Manual';
      icon = 'edit_note';
    } else if (reason === 'loss') {
      bg = 'bg-red-500/10 text-red-400 border-red-500/20';
      text = 'Pérdida/Baja';
      icon = 'trending_down';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${bg}`}>
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
        {text}
      </span>
    );
  };

  const getProductImage = (images?: string[]) => {
    if (images && images.length > 0 && images[0]) {
      return images[0];
    }
    return null;
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
              Historial de Movimientos
            </h1>
            <p className="text-zinc-400 text-sm mt-2">
              Auditoría cronológica completa de ingresos, ventas y ajustes de inventario (Kardex).
            </p>
          </div>
          
          <button 
            onClick={fetchMovements}
            className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Sincronizar
          </button>
        </div>

        {/* Filters Card */}
        <div className="bg-zinc-900/60 border border-white/5 backdrop-blur-md rounded-2xl p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="space-y-1.5 col-span-1 sm:col-span-2 lg:col-span-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Buscar Producto</label>
            <div className="relative">
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Nombre, SKU o talle..."
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors font-medium placeholder-zinc-600"
              />
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[18px]">search</span>
            </div>
          </div>

          {/* Reason Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Motivo</label>
            <select
              value={selectedReason}
              onChange={(e) => { setSelectedReason(e.target.value); setCurrentPage(1); }}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors font-semibold"
            >
              <option value="all">Todos los motivos</option>
              <option value="sale">Ventas (POS)</option>
              <option value="purchase">Compras / Ingresos</option>
              <option value="adjustment">Ajustes Manuales</option>
              <option value="loss">Pérdidas / Bajas</option>
            </select>
          </div>

          {/* Date Start */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Desde</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors font-semibold select-none"
            />
          </div>

          {/* Date End */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Hasta</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors font-semibold select-none"
            />
          </div>
        </div>

        {/* Ledger Content */}
        <div className="bg-zinc-900/60 border border-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
              <p className="text-xs text-zinc-500 font-semibold tracking-wider uppercase">Cargando transacciones...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-red-400 p-6">
              <span className="material-symbols-outlined text-4xl mb-2">warning</span>
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="py-20 text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/40 border border-white/5 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-3xl text-zinc-600">manage_search</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">No se hallaron movimientos</p>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">No hay registros de inventario cargados que cumplan con los filtros de búsqueda aplicados.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-zinc-950/30 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                    <th className="px-6 py-4">Fecha e Hora</th>
                    <th className="px-6 py-4">Producto</th>
                    <th className="px-6 py-4">SKU</th>
                    <th className="px-6 py-4">Motivo</th>
                    <th className="px-6 py-4 text-right">Variación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedMovements.map((move) => {
                    const variant = move.product_variants;
                    const product = variant?.products;
                    const isPositive = move.quantity_changed > 0;
                    
                    return (
                      <tr key={move.id} className="hover:bg-white/2 transition-colors group">
                        
                        {/* Date */}
                        <td className="px-6 py-4 text-xs font-mono text-zinc-400 whitespace-nowrap">
                          {new Intl.DateTimeFormat('es-AR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          }).format(new Date(move.created_at))}
                        </td>

                        {/* Product Detail */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden bg-cover bg-center"
                              style={{ 
                                backgroundImage: product?.images && product.images.length > 0 && product.images[0]
                                  ? `url(${product.images[0]})`
                                  : 'none'
                              }}
                            >
                              {!product?.images?.[0] && (
                                <span className="material-symbols-outlined text-zinc-500 text-[18px]">image</span>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-white truncate max-w-[220px] group-hover:text-violet-400 transition-colors">
                                {product?.nombre || 'Producto Eliminado'}
                              </span>
                              {variant?.variant_options && Object.keys(variant.variant_options).length > 0 && (
                                <span className="text-[10px] text-zinc-500 font-medium">
                                  {Object.entries(variant.variant_options)
                                    .map(([key, val]) => `${key}: ${val}`)
                                    .join(' • ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="px-6 py-4 text-xs font-mono text-zinc-400">
                          {variant?.sku || 'S/N'}
                        </td>

                        {/* Reason */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getReasonBadge(move.reason)}
                        </td>

                        {/* Quantity variation */}
                        <td className={`px-6 py-4 text-right whitespace-nowrap font-mono text-sm font-black ${
                          isPositive ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {isPositive ? `+${move.quantity_changed}` : move.quantity_changed}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-white/5 bg-zinc-950/30 flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium">
                Página <span className="text-white font-bold">{currentPage}</span> de <span className="text-white font-bold">{totalPages}</span> ({filteredMovements.length} movimientos)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-zinc-900 border border-white/5 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-xs font-semibold select-none transition-colors"
                >
                  Anterior
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-zinc-900 border border-white/5 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-xs font-semibold select-none transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
