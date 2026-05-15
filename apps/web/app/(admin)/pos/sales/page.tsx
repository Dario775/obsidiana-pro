'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

interface Order {
  id: string;
  number: number;
  total_ars: number;
  subtotal_ars: number;
  tax_ars: number;
  status: string;
  financial_status: string;
  channel: string;
  placed_at: string;
  customers?: {
    nombre: string;
  };
}

interface OrderItem {
  id: string;
  order_id: string;
  quantity: number;
  unit_price_ars: number;
  products?: {
    title: string;
  };
  product_variants?: {
    sku: string;
  };
}

export default function POSSalesHistoryPage() {
  const { tenant } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [dateFilter, setDateFilter] = useState('7'); // '7', '30', 'today', 'all'
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [tenant]);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, orders, dateFilter]);

  async function fetchOrders() {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, 
          number, 
          total_ars, 
          subtotal_ars, 
          tax_ars, 
          status, 
          financial_status, 
          channel, 
          placed_at,
          customers (
            nombre
          )
        `)
        .eq('tenant_id', tenant.id)
        .eq('channel', 'pos')
        .order('placed_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
      } else {
        setOrders(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterOrders() {
    let filtered = [...orders];

    // Filtro de fecha
    if (dateFilter !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case '7':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30':
          startDate.setDate(now.getDate() - 30);
          break;
      }

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.placed_at);
        return orderDate >= startDate;
      });
    }

    // Filtro de búsqueda
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.number?.toString().includes(search) ||
        new Date(order.placed_at).toLocaleDateString('es-AR').includes(search)
      );
    }

    setFilteredOrders(filtered);
  }

  async function viewOrderDetail(order: Order) {
    setSelectedOrder(order);
    setShowDetailModal(true);
    
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id, 
          order_id, 
          quantity, 
          unit_price_ars, 
          products (
            title
          ),
          product_variants (
            sku
          )
        `)
        .eq('order_id', order.id);

      if (error) {
        console.error('Error fetching order items:', error);
      } else {
        setOrderItems(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function exportToCSV() {
    const headers = ['N° Orden', 'Fecha', 'Subtotal', 'IVA', 'Total', 'Estado'];
    const rows = filteredOrders.map(order => [
      order.number,
      new Date(order.placed_at).toLocaleString('es-AR'),
      order.subtotal_ars,
      order.tax_ars,
      order.total_ars,
      order.status
    ]);

    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Estadísticas
  const totalRevenue = filteredOrders.reduce((acc, order) => acc + (order.total_ars || 0), 0);
  const totalOrders = filteredOrders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] mb-3">
            <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
            <span>Terminales</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-secondary">Historial de Ventas</span>
          </div>
          <h1 className="font-headline-xl text-3xl font-black text-white mb-2">Ventas del Punto de Venta</h1>
          <p className="text-zinc-400 font-body-sm text-sm max-w-2xl">Registro de todas las transacciones realizadas en el local físico.</p>
          <div className="mt-4 p-2 bg-zinc-900 rounded border border-white/5 text-[10px] font-mono text-zinc-500">
            Tenant ID: {tenant?.id || 'NULL'} | Negocio: {tenant?.nombre || 'NULL'}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer"
          >
            <option value="today">Hoy</option>
            <option value="7">Últimos 7 Días</option>
            <option value="30">Últimos 30 Días</option>
            <option value="all">Todas</option>
          </select>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1A1A1A] border border-white/5 rounded-3xl p-6 flex items-start justify-between relative overflow-hidden group hover:border-secondary/20 transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Facturación Total</p>
            <h3 className="text-2xl font-black text-white mt-2">$ {totalRevenue.toLocaleString('es-AR')}</h3>
            <div className="flex items-center gap-1 mt-3 text-emerald-400">
              <span className="material-symbols-outlined text-[16px]">payments</span>
              <span className="text-[10px] font-black uppercase tracking-tighter">{totalOrders} ventas</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-2xl">payments</span>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/5 rounded-3xl p-6 flex items-start justify-between relative overflow-hidden group hover:border-emerald-500/20 transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ticket Promedio</p>
            <h3 className="text-2xl font-black text-white mt-2">$ {Math.round(avgTicket).toLocaleString('es-AR')}</h3>
            <div className="flex items-center gap-1 mt-3 text-emerald-400">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span className="text-[10px] font-black uppercase tracking-tighter">Promedio por venta</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <span className="material-symbols-outlined text-2xl">avg_pace</span>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/5 rounded-3xl p-6 flex items-start justify-between relative overflow-hidden group hover:border-primary/20 transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total en IVA</p>
            <h3 className="text-2xl font-black text-white mt-2">
              $ {filteredOrders.reduce((acc, o) => acc + (o.tax_ars || 0), 0).toLocaleString('es-AR')}
            </h3>
            <div className="flex items-center gap-1 mt-3 text-zinc-500">
              <span className="material-symbols-outlined text-[16px]">receipt</span>
              <span className="text-[10px] font-black uppercase tracking-tighter">21% sobre ventas</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">account_balance</span>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/30">
          <div className="relative w-full md:w-96 group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-secondary transition-colors">search</span>
            <input 
              className="w-full bg-zinc-950 border border-white/5 rounded-xl py-3 pl-12 pr-6 text-sm text-white font-medium focus:ring-1 focus:ring-secondary outline-none transition-all placeholder:text-zinc-700"
              placeholder="Buscar por número de orden..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
          <button 
            onClick={fetchOrders}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-900 border border-white/5 rounded-xl text-zinc-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Actualizar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                <th className="py-4 px-8">N° Orden</th>
                <th className="py-4 px-8">Cliente</th>
                <th className="py-4 px-8">Fecha / Hora</th>
                <th className="py-4 px-8 text-right">Subtotal</th>
                <th className="py-4 px-8 text-right">IVA</th>
                <th className="py-4 px-8 text-right">Total</th>
                <th className="py-4 px-8 text-center">Estado</th>
                <th className="py-4 px-8 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm font-data-tabular text-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest animate-pulse">
                    Cargando ventas...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest">
                    No hay ventas en el período seleccionado
                  </td>
                </tr>
              ) : filteredOrders.map((order) => {
                const date = new Date(order.placed_at);
                const isPaid = order.financial_status === 'paid';
                
                return (
                  <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-5 px-8">
                      <span className="font-black text-secondary">#{order.number}</span>
                    </td>
                    <td className="py-5 px-8">
                      <span className="font-bold text-zinc-300">{order.customers?.nombre || 'Consumidor Final'}</span>
                    </td>
                    <td className="py-5 px-8">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{date.toLocaleDateString('es-AR')}</span>
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{date.toLocaleTimeString('es-AR')}</span>
                      </div>
                    </td>
                    <td className="py-5 px-8 text-right font-black text-white">$ {(order.subtotal_ars || 0).toLocaleString('es-AR')}</td>
                    <td className="py-5 px-8 text-right font-black text-zinc-400">$ {(order.tax_ars || 0).toLocaleString('es-AR')}</td>
                    <td className="py-5 px-8 text-right font-black text-lg text-white">$ {(order.total_ars || 0).toLocaleString('es-AR')}</td>
                    <td className="py-5 px-8 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        isPaid 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                        {isPaid ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => viewOrderDetail(order)}
                          className="p-2 text-zinc-500 hover:text-secondary transition-colors"
                          title="Ver Detalle"
                        >
                          <span className="material-symbols-outlined">receipt_long</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-white/5 bg-zinc-900/30 flex justify-between items-center">
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            Mostrando {filteredOrders.length} de {orders.length} ventas
          </span>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Detalle de Venta #{selectedOrder.number}</h2>
                <p className="text-zinc-500 text-sm mt-1">{new Date(selectedOrder.placed_at).toLocaleString('es-AR')}</p>
              </div>
              <button 
                onClick={() => {
                  setShowDetailModal(false);
                  setOrderItems([]);
                }}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-zinc-400">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {orderItems.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">Cargando items...</div>
              ) : (
                <>
                  <div className="space-y-3">
                    {orderItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                        <div className="flex-1">
                          <p className="font-bold text-white text-sm">{item.products?.title || 'Producto'}</p>
                          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">SKU: {item.product_variants?.sku || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-zinc-400 text-xs">{item.quantity} x $ {item.unit_price_ars?.toLocaleString('es-AR')}</p>
                          <p className="font-black text-white">$ {((item.unit_price_ars || 0) * item.quantity).toLocaleString('es-AR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/10 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Subtotal</span>
                      <span className="font-black text-white">$ {(selectedOrder.subtotal_ars || 0).toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">IVA (21%)</span>
                      <span className="font-black text-white">$ {(selectedOrder.tax_ars || 0).toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-secondary font-black uppercase tracking-[0.2em]">TOTAL</span>
                      <span className="text-2xl font-black text-white">$ {(selectedOrder.total_ars || 0).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
