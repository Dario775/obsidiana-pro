'use client';

import React, { useState, useEffect } from 'react';
import { FeatureGate } from '../../../components/feature-gate';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { reverseOrderStock } from '@/lib/stock-utils';

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
  customer_city?: string;
  customer_province?: string;
  customer_postal_code?: string;
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
  shipping_method?: string;
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
    if (!selectedOrder || !tenant?.id) return;
    setUpdatingStatus(true);

    try {
      // 1. If cancelling, reverse stock
      if (newStatus === 'cancelled' && selectedOrder.status !== 'cancelled') {
        const { success, error: stockError } = await reverseOrderStock(selectedOrder.id, tenant.id);
        if (!success) {
          console.error('Failed to reverse stock:', stockError);
          // We continue anyway, but maybe log this to a future audit table
        }
      }

      // 2. Update order status
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
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  }

  // Sanitize user input to prevent XSS in print labels
  function escapeHtml(str: string | null | undefined): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Genera un código de barras Code 39 en formato SVG
  function generateBarcodeSVG(value: string | number): string {
    // Code 39 full character set: 9 elements per char (5 bars + 4 spaces), 3 wide + 6 narrow
    const code39: Record<string, number[]> = {
      '0': [1,1,1,3,3,1,3,1,1], '1': [3,1,1,3,1,1,1,1,3], '2': [1,1,3,3,1,1,1,1,3],
      '3': [3,1,3,3,1,1,1,1,1], '4': [1,1,1,3,3,1,1,1,3], '5': [3,1,1,3,3,1,1,1,1],
      '6': [1,1,3,3,3,1,1,1,1], '7': [1,1,1,3,1,1,3,1,3], '8': [3,1,1,3,1,1,3,1,1],
      '9': [1,1,3,3,1,1,3,1,1],
      'A': [3,1,1,1,1,3,1,1,3], 'B': [1,1,3,1,1,3,1,1,3], 'C': [3,1,3,1,1,3,1,1,1],
      'D': [1,1,1,1,3,3,1,1,3], 'E': [3,1,1,1,3,3,1,1,1], 'F': [1,1,3,1,3,3,1,1,1],
      'G': [1,1,1,1,1,3,3,1,3], 'H': [3,1,1,1,1,3,3,1,1], 'I': [1,1,3,1,1,3,3,1,1],
      'J': [1,1,1,1,3,3,3,1,1], 'K': [3,1,1,1,1,1,1,3,3], 'L': [1,1,3,1,1,1,1,3,3],
      'M': [3,1,3,1,1,1,1,3,1], 'N': [1,1,1,1,3,1,1,3,3], 'O': [3,1,1,1,3,1,1,3,1],
      'P': [1,1,3,1,3,1,1,3,1], 'Q': [1,1,1,1,1,1,3,3,3], 'R': [3,1,1,1,1,1,3,3,1],
      'S': [1,1,3,1,1,1,3,3,1], 'T': [1,1,1,1,3,1,3,3,1], 'U': [3,3,1,1,1,1,1,1,3],
      'V': [1,3,3,1,1,1,1,1,3], 'W': [3,3,3,1,1,1,1,1,1], 'X': [1,3,1,1,3,1,1,1,3],
      'Y': [3,3,1,1,3,1,1,1,1], 'Z': [1,3,3,1,3,1,1,1,1],
      '-': [1,3,1,1,1,1,3,1,3], '.': [3,3,1,1,1,1,3,1,1], ' ': [1,3,3,1,1,1,3,1,1],
      '$': [1,3,1,3,1,3,1,1,1], '/': [1,3,1,3,1,1,1,3,1], '+': [1,3,1,1,1,3,1,3,1],
      '%': [1,1,1,3,1,3,1,3,1],
      '*': [1,3,1,1,3,1,3,1,1]
    };

    const cleanVal = String(value).toUpperCase().replace(/[^0-9A-Z\-.$/+% ]/g, '');
    const str = '*' + (cleanVal || '0') + '*';
    let svgPaths = '';
    let currentX = 0;
    const height = 45;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (!char) continue;
      const pattern = code39[char];
      if (!pattern) continue;
      
      for (let j = 0; j < pattern.length; j++) {
        const val = pattern[j] as number;
        const width = val * 2.2;
        const isBar = (j % 2 === 0);
        
        if (isBar) {
          svgPaths += `<rect x="${currentX}" y="0" width="${width}" height="${height}" fill="black" />`;
        }
        currentX += width;
      }
      
      // Separación entre caracteres (gap)
      if (i < str.length - 1) {
        currentX += 2.2;
      }
    }

    return `
      <svg width="${currentX}" height="${height + 22}" viewBox="0 0 ${currentX} ${height + 22}" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">
        ${svgPaths}
        <text x="${currentX / 2}" y="${height + 16}" font-family="'Courier New', monospace" font-size="12" font-weight="bold" text-anchor="middle" fill="black">${cleanVal}</text>
      </svg>
    `;
  }

  function printLabel() {
    if (!selectedOrder) return;
    
    // Sanitize all user-provided data
    const customerName = escapeHtml(selectedOrder.customer_name) || 'CLIENTE';
    
    // Construir dirección completa
    let fullAddress = '';
    if (selectedOrder.customer_address) {
      const addrLower = selectedOrder.customer_address.toLowerCase();
      if (addrLower.includes('retiro') || selectedOrder.shipping_method?.toLowerCase()?.includes('retiro')) {
        fullAddress = 'RETIRO EN TIENDA 🏪';
      } else {
        const parts = [
          selectedOrder.customer_address,
          selectedOrder.customer_city,
          selectedOrder.customer_province,
          selectedOrder.customer_postal_code ? `(CP: ${selectedOrder.customer_postal_code})` : ''
        ].filter(Boolean);
        fullAddress = parts.join(', ');
      }
    }
    const customerAddress = escapeHtml(fullAddress) || 'SIN DIRECCIÓN';
    const customerPhone = escapeHtml(selectedOrder.customer_phone) || 'SIN TEL';
    const customerEmail = escapeHtml(selectedOrder.customer_email);
    
    // Extraer método de envío de las notas
    let shippingMethodStr = '';
    if (selectedOrder.notes) {
      const methodMatch = selectedOrder.notes.match(/\[Método:\s*([^\]]+)\]/i);
      if (methodMatch && methodMatch[1]) {
        shippingMethodStr = methodMatch[1];
      }
    }
    
    // Fallback al campo nativo
    if (!shippingMethodStr && selectedOrder.shipping_method) {
      shippingMethodStr = selectedOrder.shipping_method;
    }

    // Limpiar notas eliminando comprobantes y método interno
    let cleanNotes = '';
    if (selectedOrder.notes) {
      cleanNotes = selectedOrder.notes
        .replace(/\[Comprobante de Pago\]:\s*(https?:\/\/[^\s|]+)/gi, '')
        .replace(/\[Método:\s*[^\]]+\]/gi, '')
        .split('|')
        .map(part => part.trim())
        .filter(part => part.length > 0)
        .join(' | ');
    }
    const orderNotes = escapeHtml(cleanNotes);
    const storeName = escapeHtml(tenant?.nombre) || 'Tienda';
    const itemsList = orderItems.map(i => `${escapeHtml(i.title_snapshot)} (x${i.quantity})`).join(', ');

    // Usar iframe oculto en lugar de window.open para evitar bloqueo de popups en móviles/PWA
    const existingFrame = document.getElementById('print-label-frame') as HTMLIFrameElement;
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'print-label-frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
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
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
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
      padding: 5px;
      text-align: center;
    }
    
    .items-list {
      margin-top: 10px;
      padding: 8px;
      background: #f9f9f9;
      font-size: 11px;
      color: #666;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
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
      <h1>${storeName}</h1>
      <div class="order-num">#${selectedOrder.number}</div>
      ${shippingMethodStr ? `
      <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px; color: #444;">
        ${shippingMethodStr.toLowerCase().includes('retiro') ? '🏪' : '🚚'} ${shippingMethodStr.toUpperCase()}
      </div>` : ''}
    </div>
    
    <div class="to-label">
      <div class="section">
        <div class="section-title">ENTREGAR A:</div>
        <div class="section-content">
          ${customerName.toUpperCase()}
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">DIRECCIÓN:</div>
        <div class="section-content">
          ${customerAddress.toUpperCase()}
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">CONTACTO:</div>
      <div class="section-content">
        📱 ${customerPhone}
        ${customerEmail ? `<br>✉️ ${customerEmail}` : ''}
      </div>
    </div>
    
    ${orderNotes ? `
    <div class="section">
      <div class="section-title">NOTAS:</div>
      <div class="section-content" style="font-weight: normal; font-size: 12px; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap;">
        ${orderNotes}
      </div>
    </div>
    ` : ''}
    
    <div class="items-list">
      <strong>Productos:</strong> ${itemsList}
    </div>
    
    <div class="barcode">
      ${generateBarcodeSVG(selectedOrder.number)}
    </div>
    
    <div class="from" style="margin-top: 15px; text-align: center; font-size: 10px;">
      ${storeName} - ${new Date(selectedOrder.created_at).toLocaleDateString('es-AR')}
    </div>
  </div>
</body>
</html>
    `);
    doc.close();

    // Esperar a que el iframe cargue y luego imprimir
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Fallback: si el iframe no puede imprimir, abrir en nueva ventana
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(doc.documentElement.outerHTML);
          printWindow.document.close();
          printWindow.onload = () => printWindow.print();
        }
      }
      // Limpiar el iframe después de un breve delay
      setTimeout(() => iframe.remove(), 3000);
    };
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.number?.toString().includes(searchQuery) ||
      order.customer_name?.toLowerCase()?.includes(searchQuery.toLowerCase());
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
                      <span className="text-zinc-500 text-xs">Dirección y Entrega</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          selectedOrder.customer_address === 'Retiro en Tienda' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {selectedOrder.customer_address === 'Retiro en Tienda' ? 'Retiro en Tienda 🏪' : 'Envío Local 🚚'}
                        </span>
                        {(() => {
                          const zoneMatch = selectedOrder.notes?.match(/\[Método:\s*Envío a Domicilio - Zona:\s*([^\]]+)\]/);
                          return zoneMatch ? (
                            <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                              Zona: {zoneMatch[1]}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <p className="text-white mt-1.5">{selectedOrder.customer_address || '-'}</p>
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

                 {/* Notes & Transfer Proof */}
                {selectedOrder.notes && (() => {
                  const receiptMatch = selectedOrder.notes.match(/\[Comprobante de Pago\]:\s*(https?:\/\/[^\s|]+)/);
                  const cleanNotes = selectedOrder.notes
                    .replace(/\[Comprobante de Pago\]:\s*(https?:\/\/[^\s|]+)/, '')
                    .replace(/\[Método:\s*[^\]]+\]/, '')
                    .trim()
                    .replace(/^\|\s*|\s*\|\s*$/g, '');
                  return (
                    <div className="space-y-3">
                      {cleanNotes && (
                        <div className="bg-zinc-800/50 rounded-xl p-4">
                          <h4 className="font-bold text-white text-sm mb-1">Notas</h4>
                          <p className="text-zinc-400 text-sm">{cleanNotes}</p>
                        </div>
                      )}
                      {receiptMatch && (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm">verified</span>
                              Comprobante de Transferencia
                            </h4>
                            <a 
                              href={receiptMatch[1]} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[10px] font-black text-emerald-400 uppercase tracking-wider hover:underline flex items-center gap-1"
                            >
                              Ver Original
                              <span className="material-symbols-outlined text-xs">open_in_new</span>
                            </a>
                          </div>
                          <div className="relative group rounded-lg overflow-hidden border border-white/5 max-w-xs mx-auto aspect-video cursor-zoom-in">
                            <img 
                              src={receiptMatch[1]} 
                              alt="Comprobante de transferencia" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <a 
                              href={receiptMatch[1]} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-xs uppercase tracking-wider transition-opacity duration-300"
                            >
                              Ver Pantalla Completa
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-white/10 flex gap-3">
                <button onClick={printLabel} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">print</span>
                  Imprimir Etiqueta
                </button>
                <button 
                  onClick={() => {
                    const phone = selectedOrder.customer_phone?.replace(/\D/g, '') || '';
                    const msg = encodeURIComponent(
                      `¡Hola ${selectedOrder.customer_name || 'Cliente'}! 👋\n` +
                      `Te contactamos de *${tenant?.nombre || 'nuestra tienda'}* por tu pedido #${selectedOrder.number}.\n` +
                      `Total: $${(selectedOrder.total_ars || 0).toLocaleString('es-AR')}\n` +
                      `¿En qué podemos ayudarte?`
                    );
                    window.open(`https://wa.me/${phone.startsWith('54') ? phone : '54' + phone}?text=${msg}`, '_blank');
                  }}
                  disabled={!selectedOrder.customer_phone}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined">chat</span>
                  {selectedOrder.customer_phone ? 'WhatsApp' : 'Sin teléfono'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}