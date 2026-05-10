'use client';

import React, { useState, useEffect } from 'react';
import { FeatureGate } from '../../../components/feature-gate';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';

interface OrderItem {
  id: string;
  title_snapshot: string;
  quantity: number;
  unit_price_ars: number;
}

interface Order {
  id: string;
  number: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  notes: string;
  payment_method: string;
  subtotal_ars: number;
  tax_ars: number;
  total_ars: number;
  currency: string;
  status: string;
  financial_status: string;
  fulfillment_status: string;
  channel: string;
  created_at: string;
}

const STATUSES = [
  { value: 'pending', label: 'Pendiente', color: 'amber' },
  { value: 'paid', label: 'Pagado', color: 'emerald' },
  { value: 'processing', label: 'Procesando', color: 'blue' },
  { value: 'shipped', label: 'Enviado', color: 'cyan' },
  { value: 'delivered', label: 'Entregado', color: 'violet' },
  { value: 'cancelled', label: 'Cancelado', color: 'red' },
];

export default function OrdersPage() {
  const { tenant } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [tenant?.id]);

  async function fetchOrders() {
    if (!tenant?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('channel', 'online')
      .order('created_at', { ascending: false });

    if (!error && data) setOrders(data);
    setLoading(false);
  }

  async function selectOrder(order: Order) {
    setSelectedOrder(order);
    setLoadingItems(true);
    const { data } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);
    setOrderItems(data || []);
    setLoadingItems(false);
  }

  async function updateStatus(newStatus: string) {
    if (!selectedOrder) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        financial_status: newStatus === 'paid' ? 'paid' : newStatus === 'cancelled' ? 'refunded' : 'pending'
      })
      .eq('id', selectedOrder.id);

    if (!error) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
      fetchOrders();
    }
    setUpdatingStatus(false);
  }

  function printLabel() {
    if (!selectedOrder) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Etiqueta de Envío - Pedido #${selectedOrder.number}</title>
  <style>
    @page { size: 10cm 15cm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; padding: 10px; }
    
    .label {
      width: 100%;
      max-width: 400px;
      border: 2px dashed #333;
      padding: 15px;
      font-size: 14px;
      background: white;
    }
    
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -1px;
    }
    
    .header .order-num {
      font-size: 20px;
      font-weight: 700;
      background: #333;
      color: white;
      display: inline-block;
      padding: 4px 15px;
      margin-top: 5px;
    }
    
    .section {
      margin-bottom: 12px;
    }
    
    .section-title {
      font-weight: 900;
      font-size: 10px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 3px;
    }
    
    .section-content {
      font-size: 16px;
      font-weight: bold;
      line-height: 1.3;
    }
    
    .to-label {
      background: #ffff00;
      padding: 10px;
      margin-bottom: 15px;
      border: 2px solid #333;
    }
    
    .to-label .section-title {
      font-size: 8px;
      color: #333;
    }
    
    .to-label .section-content {
      font-size: 18px;
    }
    
    .from {
      font-size: 12px;
      color: #666;
    }
    
    .barcode {
      margin-top: 15px;
      padding: 10px;
      background: #f5f5f5;
      text-align: center;
      font-family: 'Courier New', monospace;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 5px;
    }
    
    .items-list {
      margin-top: 10px;
      padding: 8px;
      background: #f9f9f9;
      font-size: 11px;
      color: #666;
    }
    
    @media print {
      body { padding: 0; }
      .label { border: none; }
    }
  </style>
</head>
<body>
  <div class="label">
    <div class="header">
      <h1>${tenant?.nombre || 'Tienda'}</h1>
      <div class="order-num">#${selectedOrder.number}</div>
    </div>
    
    <div class="to-label">
      <div class="section">
        <div class="section-title">ENTREGAR A:</div>
        <div class="section-content">
          ${selectedOrder.customer_name?.toUpperCase() || 'CLIENTE'}
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">DIRECCIÓN:</div>
        <div class="section-content">
          ${selectedOrder.customer_address?.toUpperCase() || 'SIN DIRECCIÓN'}
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">CONTACTO:</div>
      <div class="section-content">
        📱 ${selectedOrder.customer_phone || 'SIN TEL'}
        ${selectedOrder.customer_email ? `<br>✉️ ${selectedOrder.customer_email}` : ''}
      </div>
    </div>
    
    ${selectedOrder.notes ? `
    <div class="section">
      <div class="section-title">NOTAS:</div>
      <div class="section-content" style="font-weight: normal; font-size: 12px;">
        ${selectedOrder.notes}
      </div>
    </div>
    ` : ''}
    
    <div class="items-list">
      <strong>Productos:</strong> ${orderItems.map(i => `${i.title_snapshot} (x${i.quantity})`).join(', ')}
    </div>
    
    <div class="barcode">
      ██ ${selectedOrder.number} ██
    </div>
    
    <div class="from" style="margin-top: 15px; text-align: center; font-size: 10px;">
      ${tenant?.nombre || 'Tienda'} - ${new Date(selectedOrder.created_at).toLocaleDateString('es-AR')}
    </div>
  </div>
  <script>window.print();</script>
</body>
</html>
    `);
    printWindow.document.close();
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.number?.toString().includes(searchQuery) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      shipped: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      delivered: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return colors[status] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <FeatureGate feature="online_store">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Pedidos Web</h1>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
              Órdenes de compra desde tu tienda online
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2 py-1 rounded border border-emerald-500/20 uppercase tracking-widest">
              {filteredOrders.length} pedidos
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Buscar por número, cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            <option value="">Todos los estados</option>
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-4xl animate-spin text-zinc-500">sync</span>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-zinc-600 mb-2">shopping_bag</span>
              <p className="text-zinc-500 text-sm">No hay pedidos web todavía</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Orden</th>
                    <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Cliente</th>
                    <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Fecha</th>
                    <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Total</th>
                    <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Estado</th>
                    <th className="py-3 px-6 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => selectOrder(order)}>
                      <td className="py-4 px-6">
                        <span className="text-xs font-bold text-white">#{order.number}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <span className="text-xs font-black text-violet-400">
                              {(order.customer_name || '?')[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-white block">
                              {order.customer_name || 'Sin nombre'}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {order.customer_phone || ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-zinc-500">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="py-4 px-6 text-xs font-bold text-white">
                        ${(order.total_ars || 0).toLocaleString('es-AR')}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); selectOrder(order); }}
                          className="p-1 text-zinc-600 hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-zinc-900 rounded-2xl max-h-[85vh] flex flex-col">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Pedido #{selectedOrder.number}</h3>
                <button onClick={() => setSelectedOrder(null)} className="text-zinc-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Status */}
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(status => (
                    <button
                      key={status.value}
                      onClick={() => updateStatus(status.value)}
                      disabled={updatingStatus}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                        selectedOrder.status === status.value
                          ? `bg-${status.color}-500 text-white border-${status.color}-500`
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>

                {/* Customer Info */}
                <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-white text-sm">Datos del Cliente</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-zinc-500 text-xs">Nombre</span>
                      <p className="text-white">{selectedOrder.customer_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs">Teléfono</span>
                      <p className="text-white">{selectedOrder.customer_phone || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-zinc-500 text-xs">Email</span>
                      <p className="text-white">{selectedOrder.customer_email || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-zinc-500 text-xs">Dirección</span>
                      <p className="text-white">{selectedOrder.customer_address || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3">
                  <h4 className="font-bold text-white text-sm">Productos</h4>
                  {loadingItems ? (
                    <div className="text-center py-4"><span className="animate-spin text-zinc-500">sync</span></div>
                  ) : (
                    <div className="space-y-2">
                      {orderItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-zinc-800/30 rounded-lg p-3">
                          <div>
                            <p className="text-white text-sm">{item.title_snapshot}</p>
                            <p className="text-zinc-500 text-xs">x{item.quantity}</p>
                          </div>
                          <p className="text-white font-bold">${((item.unit_price_ars || 0) * item.quantity).toLocaleString('es-AR')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-white pt-2 border-t border-white/10">
                    <span>Total</span>
                    <span>${(selectedOrder.total_ars || 0).toLocaleString('es-AR')}</span>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <h4 className="font-bold text-white text-sm mb-2">Notas</h4>
                    <p className="text-zinc-400 text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-white/10 flex gap-3">
                <button onClick={printLabel} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">print</span>
                  Imprimir Etiqueta
                </button>
                <button className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">Whatsapp</span>
                  Contactar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}