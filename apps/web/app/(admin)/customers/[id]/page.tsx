'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useTenant } from '@/hooks/use-tenant';

interface Order {
  id: string;
  number: number;
  total_ars: number;
  subtotal_ars: number;
  tax_ars: number;
  status: string;
  financial_status: string;
  fulfillment_status: string | null;
  channel: string;
  placed_at: string;
}

interface Payment {
  id: string;
  order_id: string;
  amount_ars: number;
  status: string;
  method: string | null;
  processed_at: string;
  created_at?: string;
}

interface OrderItem {
  id: string;
  title_snapshot: string;
  sku_snapshot: string;
  quantity: number;
  unit_price_ars: number;
  tax_ars: number;
}

interface Customer {
  id: string;
  nombre: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  dni_cuit: string | null;
  phone: string | null;
  credit_limit: number;
  created_at: string;
}

type TabType = 'history' | 'account' | 'logistics';

interface AccountTransaction {
  id: string;
  date: string;
  concept: string;
  type: 'charge' | 'payment' | 'credit_note';
  amount: number;
  method?: string | null;
  status: string;
}

export default function CustomerDetailPage() {
  const { tenant } = useTenant();
  const params = useParams();
  const id = params?.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('history');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  
  // Estados para registro de pagos
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [paymentNote, setPaymentNote] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<{
    receiptId: string;
    orderNumber: number;
    amount: number;
    method: string;
    date: string;
    customerName: string;
    customerDni: string;
    customerPhone: string;
    customerEmail: string;
    previousBalance: number;
    newBalance: number;
    notes?: string;
  } | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<typeof lastPaymentReceipt>(null);

  function showReceiptPreviewModal(data: typeof lastPaymentReceipt) {
    if (!data) return;
    setPreviewReceipt(data);
    setShowReceiptPreview(true);
  }

  function printPaymentReceipt(data: typeof lastPaymentReceipt) {
    if (!data) return;
    
    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    if (!receiptWindow) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo de Pago #${data.receiptId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; color: #111; line-height: 1.4; }
          .header { text-align: center; margin-bottom: 12px; }
          .header h1 { font-size: 15px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
          .header p { font-size: 9px; color: #555; }
          .receipt-id { font-size: 10px; font-weight: bold; color: #333; margin-top: 4px; }
          .divider { border-bottom: 1px dashed #aaa; margin: 12px 0; }
          .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 6px; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .row .label { color: #555; }
          .row .value { font-weight: bold; text-align: right; }
          .balance-box { background: #fdfdfd; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-top: 8px; }
          .total { font-size: 13px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 9px; color: #666; border-top: 1px dashed #bbb; padding-top: 12px; }
          .footer p { margin-bottom: 2px; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏦 RECIBO DE PAGO</h1>
          <p>Obsidiana - Sistema de Gestión</p>
          <div class="receipt-id">Nº ${data.receiptId}</div>
        </div>
        
        <div class="divider"></div>
        
        <div class="section-title">Detalles del Comprobante</div>
        <div class="row">
          <span class="label">Fecha y Hora:</span>
          <span class="value">${data.date}</span>
        </div>
        <div class="row">
          <span class="label">Orden vinculada:</span>
          <span class="value">#${data.orderNumber}</span>
        </div>
        <div class="row">
          <span class="label">Método de pago:</span>
          <span class="value" style="text-transform: capitalize;">${data.method}</span>
        </div>
        ${data.notes ? `
        <div class="row">
          <span class="label">Observaciones:</span>
          <span class="value">${data.notes}</span>
        </div>` : ''}

        <div class="divider"></div>

        <div class="section-title">Datos del Cliente</div>
        <div class="row">
          <span class="label">Nombre:</span>
          <span class="value">${data.customerName}</span>
        </div>
        <div class="row">
          <span class="label">DNI / CUIT:</span>
          <span class="value">${data.customerDni}</span>
        </div>
        <div class="row">
          <span class="label">Teléfono:</span>
          <span class="value">${data.customerPhone}</span>
        </div>
        <div class="row">
          <span class="label">Email:</span>
          <span class="value">${data.customerEmail}</span>
        </div>

        <div class="divider"></div>

        <div class="section-title">Resumen de Cuenta</div>
        <div class="row">
          <span class="label">Saldo anterior:</span>
          <span class="value">$ ${(data?.previousBalance ?? 0).toLocaleString('es-AR')}</span>
        </div>
        <div class="row total">
          <span class="label">Monto abonado:</span>
          <span class="value">$ ${(data?.amount ?? 0).toLocaleString('es-AR')}</span>
        </div>
        
        <div class="balance-box">
          <div class="row" style="margin: 0; font-weight: bold;">
            <span class="label" style="color: #111;">${(data?.newBalance ?? 0) > 0 ? 'Saldo pendiente restante:' : 'Saldo a favor restante:'}</span>
            <span class="value" style="font-size: 12px; color: ${(data?.newBalance ?? 0) > 0 ? '#b91c1c' : '#15803d'};">
              $ ${Math.abs(data?.newBalance ?? 0).toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        <div class="footer">
          <p>¡Muchas gracias por su pago!</p>
          <p>Documento de control interno no válido como factura fiscal</p>
          <p>Obsidiana Cloud POS</p>
        </div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `;
    
    receiptWindow.document.write(html);
    receiptWindow.document.close();
  }

  useEffect(() => {
    if (id && tenant?.id) {
      fetchCustomerData();
    }
  }, [id, tenant]);

  // Auto-mostrar vista previa del recibo después de registrar pago
  useEffect(() => {
    if (lastPaymentReceipt) {
      showReceiptPreviewModal(lastPaymentReceipt);
      setLastPaymentReceipt(null);
    }
  }, [lastPaymentReceipt]);

  async function fetchCustomerData() {
    setLoading(true);
    try {
      // Fetch customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (customerError) {
        console.error('Error fetching customer:', customerError);
        setLoading(false);
        return;
      }

      setCustomer(customerData);

       // Fetch orders for this customer
       const { data: ordersData, error: ordersError } = await supabase
         .from('orders')
         .select('id, number, total_ars, subtotal_ars, tax_ars, status, financial_status, channel, placed_at')
         .eq('customer_id', id)
         .order('placed_at', { ascending: false });

       if (ordersError) {
         console.error('Error fetching orders:', ordersError);
       } else {
         // Map fulfillment_status in memory since it's not a database column
         const mappedOrders = (ordersData || []).map(order => ({
           ...order,
           fulfillment_status: order.channel === 'pos' || order.status === 'delivered' ? 'fulfilled' : 'unfulfilled'
         })) as any[];
         setOrders(mappedOrders);
       }

      // Fetch payments for this customer's orders
      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map(o => o.id);
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('id, order_id, amount, status, method, created_at')
          .in('order_id', orderIds)
          .order('created_at', { ascending: false });

        if (paymentsError) {
          console.error('Error fetching payments:', paymentsError);
        } else {
          // Adaptar 'amount' a 'amount_ars' y 'created_at' a 'processed_at' para el estado local
          const adaptedPayments = (paymentsData || []).map(p => ({
            ...p,
            amount_ars: (p as any).amount,
            processed_at: p.created_at
          }));
          setPayments(adaptedPayments);
        }
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrderItems(orderId: string) {
    if (orderItems[orderId]) return;
    
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id, 
          quantity, 
          unit_price_ars,
          products (
            title
          ),
          product_variants (
            sku
          )
        `)
        .eq('order_id', orderId);

      if (error) {
        console.error('Error fetching order items:', error);
      } else {
        const adaptedItems = (data || []).map((item: any) => ({
          ...item,
          title_snapshot: item.products?.title || 'Producto',
          sku_snapshot: item.product_variants?.sku || 'N/A'
        }));
        setOrderItems(prev => ({ ...prev, [orderId]: adaptedItems }));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function registerPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrderForPayment) return;

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Ingresá un monto válido');
      return;
    }

    setProcessingPayment(true);
    try {
      if (!tenant?.id) {
        alert('Error: No se pudo identificar el tenant. Recargá la página.');
        return;
      }
      const tenantId = tenant.id;

      // 1. Registrar el pago
      // Convertir método de pago a gateway válido
      const gatewayMap: Record<string, string> = {
        'efectivo': 'cash',
        'tarjeta': 'stripe',
        'transferencia': 'transfer',
        'mp': 'mercadopago'
      };
      const gateway = gatewayMap[paymentMethod] || 'cash';
      
      const { data: insertedPayment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          tenant_id: tenantId,
          order_id: selectedOrderForPayment.id,
          status: 'paid',
          amount: Math.round(amount),
          amount_ars: Math.round(amount),
          method: paymentMethod,
          gateway: gateway,
          processed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          metadata: { type: 'credit_repayment' }
        })
        .select('id')
        .single();

      if (paymentError) throw paymentError;

      // 2. Calcular total pagado para esta orden
      const { data: orderPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('order_id', selectedOrderForPayment.id)
        .eq('status', 'paid');

      const totalPaid = (orderPayments || []).reduce((acc, p) => acc + (Number((p as any).amount) || 0), 0);
      const orderTotal = selectedOrderForPayment.total_ars || 0;

      // 3. Actualizar estado financiero de la orden
      let newFinancialStatus = 'pending';
      if (totalPaid >= orderTotal) {
        newFinancialStatus = 'paid';
      } else if (totalPaid > 0) {
        newFinancialStatus = 'partial';
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({ financial_status: newFinancialStatus })
        .eq('id', selectedOrderForPayment.id);

      if (updateError) throw updateError;

      // Guardar saldo antes de recargar
      const prevBal = pendingAmount;

      // 4. Cerrar modal y recargar datos
      setShowPaymentModal(false);
      setSelectedOrderForPayment(null);
      setPaymentAmount('');
      setPaymentMethod('efectivo');
      setPaymentNote('');
      
      await fetchCustomerData();
      
      // Mostrar recibo
      setLastPaymentReceipt({
        receiptId: insertedPayment?.id ? insertedPayment.id.substring(0, 8).toUpperCase() : 'REC-' + Math.floor(Math.random()*100000),
        orderNumber: selectedOrderForPayment.number,
        amount: Math.round(amount),
        method: paymentMethod,
        date: new Date().toLocaleString('es-AR'),
        customerName: customer ? (customer.nombre || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()) : 'Cliente',
        customerDni: customer?.dni_cuit || 'No registrado',
        customerPhone: customer?.phone || 'No registrado',
        customerEmail: customer?.email || 'No registrado',
        previousBalance: prevBal,
        newBalance: prevBal - amount,
        notes: paymentNote || undefined
      });
      
      alert(`Pago de $ ${(amount || 0).toLocaleString('es-AR')} registrado. Imprimiendo recibo...`);

    } catch (error: any) {
      console.error('Error al registrar pago:', error);
      alert('Error al registrar pago: ' + error.message);
    } finally {
      setProcessingPayment(false);
    }
  }

  function openPaymentModal(order: Order) {
    // Calcular cuánto falta pagar
    const orderPayments = payments.filter(p => p.order_id === order.id && p.status === 'paid');
    const totalPaid = orderPayments.reduce((acc, p) => acc + (p.amount_ars || 0), 0);
    const remaining = (order.total_ars || 0) - totalPaid;
    
    setSelectedOrderForPayment(order);
    setPaymentAmount(remaining > 0 ? remaining.toString() : '');
    setShowPaymentModal(true);
  }

  const totalSpent = orders.reduce((acc, order) => acc + (order.total_ars || 0), 0);
  const totalPayments = payments.filter(p => p.status === 'paid').reduce((acc, payment) => acc + (payment.amount_ars || 0), 0);
  const pendingAmount = totalSpent - totalPayments;
  const creditLimit = customer?.credit_limit || 0;
  const availableCredit = creditLimit > 0 ? Math.max(0, creditLimit - pendingAmount) : null;
  const creditUsagePercent = creditLimit > 0 ? Math.min(100, (pendingAmount / creditLimit) * 100) : 0;
  const isOverLimit = creditLimit > 0 && pendingAmount > creditLimit;
  const completedOrders = orders.filter(o => o.status === 'closed').length;
  const lastOrderDate = orders[0]?.placed_at ? new Date(orders[0].placed_at) : null;

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      order.number?.toString().includes(search) ||
      new Date(order.placed_at).toLocaleDateString('es-AR').toLowerCase().includes(search)
    );
  });

  function getStatusColor(status: string): string {
    switch (status) {
      case 'closed': return 'emerald';
      case 'open': return 'amber';
      case 'cancelled': return 'red';
      default: return 'zinc';
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case 'closed': return 'Completado';
      case 'open': return 'Abierto';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  }

  function getFinancialStatusColor(status: string): string {
    switch (status) {
      case 'paid': return 'emerald';
      case 'pending': return 'amber';
      case 'refunded': return 'red';
      default: return 'zinc';
    }
  }

  function getFinancialStatusLabel(status: string): string {
    switch (status) {
      case 'paid': return 'Pagado';
      case 'pending': return 'Pendiente';
      case 'refunded': return 'Reembolsado';
      default: return status;
    }
  }

  function getFulfillmentLabel(status: string | null): string {
    if (!status) return 'Pendiente';
    switch (status) {
      case 'fulfilled': return 'Entregado';
      case 'partial': return 'Parcial';
      case 'unfulfilled': return 'Pendiente';
      default: return status;
    }
  }

  function getFulfillmentColor(status: string | null): string {
    if (!status) return 'amber';
    switch (status) {
      case 'fulfilled': return 'emerald';
      case 'partial': return 'amber';
      case 'unfulfilled': return 'red';
      default: return 'zinc';
    }
  }

  function getChannelLabel(channel: string): string {
    switch (channel) {
      case 'pos': return 'Punto de Venta';
      case 'online': return 'Tienda Online';
      default: return channel;
    }
  }

  function getInitials(customer: Customer | null): string {
    const first = customer?.first_name?.[0] || customer?.nombre?.[0] || '';
    const last = customer?.last_name?.[0] || '';
    return (first + last).toUpperCase() || customer?.email?.[0]?.toUpperCase() || '?';
  }

  function getFullName(customer: Customer | null): string {
    const name = customer?.nombre || `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim();
    return name || 'Sin nombre';
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
        <div className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest animate-pulse">
          Cargando cliente...
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
        <div className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest">
          Cliente no encontrado
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Customer Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/10 pb-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/10 shrink-0 shadow-2xl group hover:border-primary/50 transition-all">
            <span className="font-headline-xl text-4xl text-primary font-black">{getInitials(customer)}</span>
          </div>
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="font-headline-xl text-3xl font-black text-white">{getFullName(customer)}</h1>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 font-body-sm text-zinc-500">
              {customer.dni_cuit && (
                <span className="flex items-center gap-2 font-bold uppercase tracking-tighter text-[11px]">
                  <span className="material-symbols-outlined text-[18px]">badge</span> 
                  DNI/CUIT: {customer.dni_cuit}
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-2 font-bold uppercase tracking-tighter text-[11px]">
                  <span className="material-symbols-outlined text-[18px]">phone</span> 
                  {customer.phone}
                </span>
              )}
              <span className="flex items-center gap-2 font-bold uppercase tracking-tighter text-[11px]">
                <span className="material-symbols-outlined text-[18px]">mail</span> 
                {customer.email}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link 
            href="/customers"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-black text-[11px] uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span> 
            Volver
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1A1A1A] p-6 rounded-xl border border-white/10 flex flex-col gap-2 relative overflow-hidden group hover:border-white/20 transition-all">
          <div className="absolute -right-4 -top-4 text-zinc-800 opacity-20 group-hover:opacity-40 transition-opacity">
            <span className="material-symbols-outlined text-7xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
          </div>
          <span className="font-black text-[10px] text-zinc-500 uppercase tracking-[0.2em] relative z-10">Total Gastado</span>
          <span className="font-data-tabular text-2xl font-black text-white relative z-10">$ {(totalSpent || 0).toLocaleString('es-AR')}</span>
          <span className="font-body-sm text-emerald-400 font-black text-[10px] flex items-center gap-1.5 mt-2 relative z-10 uppercase tracking-widest">
            <span className="material-symbols-outlined text-[14px]">shopping_cart</span> 
            {orders.length} órdenes
          </span>
        </div>

        <div className={`bg-[#1A1A1A] p-6 rounded-xl border flex flex-col gap-2 relative overflow-hidden transition-all ${
          pendingAmount > 0 ? 'border-red-500/30 shadow-[inset_0_0_30px_rgba(239,68,68,0.05)] group hover:border-red-500/50' : 
          pendingAmount < 0 ? 'border-emerald-500/30 shadow-[inset_0_0_30px_rgba(16,185,129,0.05)] group hover:border-emerald-500/50' : 
          'border-white/10 group hover:border-white/20'
        }`}>
          <div className={`absolute -right-4 -top-4 transition-colors ${
            pendingAmount > 0 ? 'text-red-500/10 group-hover:text-red-500/20' : 
            pendingAmount < 0 ? 'text-emerald-500/10 group-hover:text-emerald-500/20' : 
            'text-zinc-800 opacity-20 group-hover:opacity-40'
          }`}>
            <span className="material-symbols-outlined text-7xl" style={{ fontVariationSettings: "'FILL' 1" }}>{pendingAmount < 0 ? 'check_circle' : 'warning'}</span>
          </div>
          <span className={`font-black text-[10px] uppercase tracking-[0.2em] relative z-10 ${
            pendingAmount > 0 ? 'text-red-400' : pendingAmount < 0 ? 'text-emerald-400' : 'text-zinc-500'
          }`}>
            {pendingAmount >= 0 ? 'Saldo Pendiente' : 'Saldo a Favor'}
          </span>
          <span className={`font-data-tabular text-2xl font-black relative z-10 ${
            pendingAmount > 0 ? 'text-red-500' : pendingAmount < 0 ? 'text-emerald-400' : 'text-white'
          }`}>
            {pendingAmount > 0 
              ? `$ ${(pendingAmount || 0).toLocaleString('es-AR')}` 
              : pendingAmount < 0 
                ? `$ ${Math.abs(pendingAmount || 0).toLocaleString('es-AR')} a favor` 
                : '$ 0'}
          </span>
          <span className={`font-body-sm font-black text-[10px] flex items-center gap-1.5 mt-2 relative z-10 uppercase tracking-widest ${
            pendingAmount > 0 ? 'text-red-400/80' : pendingAmount < 0 ? 'text-emerald-400/80' : 'text-zinc-500'
          }`}>
            <span className="material-symbols-outlined text-[14px]">payments</span> 
            {pendingAmount > 0 ? `${orders.filter(o => o.financial_status !== 'paid').length} ordenes pendientes` : pendingAmount < 0 ? 'Con crédito a favor' : 'Al día'}
          </span>
        </div>

        <div className="bg-[#1A1A1A] p-6 rounded-xl border border-white/10 flex flex-col gap-2 relative overflow-hidden group hover:border-white/20 transition-all">
          <div className="absolute -right-4 -top-4 text-zinc-800 opacity-20 group-hover:opacity-40 transition-opacity">
            <span className="material-symbols-outlined text-7xl" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_cart_checkout</span>
          </div>
          <span className="font-black text-[10px] text-zinc-500 uppercase tracking-[0.2em] relative z-10">Última Compra</span>
          <span className="font-data-tabular text-2xl font-black text-white relative z-10">
            {lastOrderDate ? `${Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))} días` : 'Nunca'}
          </span>
          <span className="text-zinc-500 font-black text-[10px] mt-2 relative z-10 uppercase tracking-tighter">
            {lastOrderDate ? formatDate(lastOrderDate.toISOString()) : 'Sin compras'}
          </span>
        </div>

        <div className={`bg-[#1A1A1A] p-6 rounded-xl border flex flex-col gap-2 relative overflow-hidden transition-all ${
          isOverLimit ? 'border-red-500/30 shadow-[inset_0_0_30px_rgba(239,68,68,0.05)] group hover:border-red-500/50' : 
          creditUsagePercent > 80 ? 'border-amber-500/30 group hover:border-amber-500/50' : 
          'border-white/10 group hover:border-primary/30'
        }`}>
          <div className={`absolute -right-4 -top-4 transition-colors ${
            isOverLimit ? 'text-red-500/10 group-hover:text-red-500/20' : 
            creditUsagePercent > 80 ? 'text-amber-500/10 group-hover:text-amber-500/20' : 
            'text-primary/10 group-hover:text-primary/20'
          }`}>
            <span className="material-symbols-outlined text-7xl" style={{ fontVariationSettings: "'FILL' 1" }}>{isOverLimit ? 'block' : creditUsagePercent > 80 ? 'warning' : 'credit_card'}</span>
          </div>
          <span className={`font-black text-[10px] uppercase tracking-[0.2em] relative z-10 ${
            isOverLimit ? 'text-red-400' : creditUsagePercent > 80 ? 'text-amber-400' : 'text-primary'
          }`}>
            {creditLimit > 0 ? 'Crédito Disponible' : 'Sin Límite'}
          </span>
          <span className={`font-data-tabular text-2xl font-black relative z-10 ${
            isOverLimit ? 'text-red-500' : creditUsagePercent > 80 ? 'text-amber-400' : 'text-white'
          }`}>
            {creditLimit > 0 ? `$ ${(availableCredit ?? 0).toLocaleString('es-AR')}` : '∞'}
          </span>
          {creditLimit > 0 && (
            <span className={`font-body-sm font-black text-[10px] flex items-center gap-1.5 mt-2 relative z-10 uppercase tracking-widest ${
              isOverLimit ? 'text-red-400/80' : creditUsagePercent > 80 ? 'text-amber-400/80' : 'text-zinc-500'
            }`}>
              <span className="material-symbols-outlined text-[14px]">{isOverLimit ? 'block' : 'trending_up'}</span> 
              {isOverLimit ? '¡Excedido!' : `${Math.round(creditUsagePercent)}% usado`}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-10 border-b border-white/10">
          {[
            { id: 'history' as TabType, label: 'Historial de Compras', icon: 'history' },
            { id: 'account' as TabType, label: 'Cuenta Corriente', icon: 'receipt_long' },
            { id: 'logistics' as TabType, label: 'Logística', icon: 'local_shipping' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2 transition-all border-b-2 ${
                activeTab === tab.id 
                  ? 'text-primary border-primary' 
                  : 'text-zinc-500 hover:text-white border-transparent hover:border-white/20'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          {/* Toolbar */}
          <div className="p-6 border-b border-white/5 bg-[#1E1E1E]/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80 group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors text-lg">search</span>
              <input 
                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white font-medium focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-600"
                placeholder="Buscar por ID o Fecha..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={fetchCustomerData}
                className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span> 
                Actualizar
              </button>
            </div>
          </div>

          {/* HISTORIAL DE COMPRAS */}
          {activeTab === 'history' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1E1E1E]/30 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    <th className="py-4 px-8">N° Orden</th>
                    <th className="py-4 px-8">Fecha</th>
                    <th className="py-4 px-8">Canal</th>
                    <th className="py-4 px-8 text-right">Subtotal</th>
                    <th className="py-4 px-8 text-right">IVA</th>
                    <th className="py-4 px-8 text-right">Total</th>
                    <th className="py-4 px-8 text-center">Estado</th>
                    <th className="py-4 px-8 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm font-data-tabular">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest">
                        {searchQuery ? 'No se encontraron órdenes' : 'Sin historial de compras'}
                      </td>
                    </tr>
                  ) : filteredOrders.map((order) => {
                    const statusColor = getStatusColor(order.status);
                    const isExpanded = expandedOrder === order.id;
                    
                    return (
                      <Fragment key={order.id}>
                        <tr 
                          className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedOrder(null);
                            } else {
                              setExpandedOrder(order.id);
                              fetchOrderItems(order.id);
                            }
                          }}
                        >
                          <td className="py-5 px-8 font-black text-primary">#{order.number}</td>
                          <td className="py-5 px-8">
                            <div className="flex flex-col">
                              <span className="text-white">{formatDate(order.placed_at)}</span>
                              <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{formatTime(order.placed_at)}</span>
                            </div>
                          </td>
                          <td className="py-5 px-8">
                            <span className="text-zinc-400">{getChannelLabel(order.channel)}</span>
                          </td>
                          <td className="py-5 px-8 text-right font-black text-white">$ {(order.subtotal_ars || 0).toLocaleString('es-AR')}</td>
                          <td className="py-5 px-8 text-right font-black text-zinc-400">$ {(order.tax_ars || 0).toLocaleString('es-AR')}</td>
                          <td className="py-5 px-8 text-right font-black text-lg text-white">$ {(order.total_ars || 0).toLocaleString('es-AR')}</td>
                          <td className="py-5 px-8 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-${statusColor}-500/10 text-${statusColor}-400 border-${statusColor}-500/20`}>
                              <div className={`w-1.5 h-1.5 rounded-full bg-${statusColor}-400`}></div>
                              {getStatusLabel(order.status)}
                            </span>
                          </td>
                          <td className="py-5 px-8 text-right">
                            <span className="material-symbols-outlined text-zinc-600 transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : '' }}>expand_more</span>
                          </td>
                        </tr>
                        
                        {/* Expanded Items */}
                        {isExpanded && (
                          <tr className="bg-zinc-900/30">
                            <td colSpan={8} className="px-8 py-4">
                              <div className="space-y-2">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Items de la orden:</p>
                                {orderItems[order.id] && Array.isArray(orderItems[order.id]) ? (
                                  (orderItems[order.id] as OrderItem[]).map((item) => (
                                    <div key={item.id} className="flex justify-between items-center py-2 px-4 bg-zinc-900/50 rounded-lg">
                                      <div>
                                        <p className="text-white text-sm font-bold">{item.title_snapshot || 'Producto'}</p>
                                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">SKU: {item.sku_snapshot || 'N/A'}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-zinc-400 text-xs">{item.quantity} x $ {(item.unit_price_ars ?? 0).toLocaleString('es-AR')}</p>
                                        <p className="text-white font-black">$ {((item.unit_price_ars || 0) * item.quantity).toLocaleString('es-AR')}</p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center text-zinc-500 py-4">Cargando items...</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                       </Fragment>
                     );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* CUENTA CORRIENTE */}
          {activeTab === 'account' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1E1E1E]/30 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    <th className="py-4 px-8">Fecha</th>
                    <th className="py-4 px-8">Concepto</th>
                    <th className="py-4 px-8 text-right text-red-400">Debe</th>
                    <th className="py-4 px-8 text-right text-emerald-400">Haber</th>
                    <th className="py-4 px-8 text-right">Saldo</th>
                    <th className="py-4 px-8 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm font-data-tabular">
                  {(() => {
                    // Crear lista combinada de transacciones (órdenes + pagos)
                    const transactions: AccountTransaction[] = [];
                    

                    // Agregar órdenes como cargos
                    orders.forEach(order => {
                      transactions.push({
                        id: `order-${order.id}`,
                        date: order.placed_at,
                        concept: `Orden #${order.number}`,
                        type: 'charge',
                        amount: order.total_ars || 0,
                        status: order.financial_status,
                      });
                    });

                    // Agregar pagos como abonos (solo los completados/pagados)
                    payments.forEach(payment => {
                      if (payment.status !== 'paid') return;
                      const order = orders.find(o => o.id === payment.order_id);
                      transactions.push({
                        id: `payment-${payment.id}`,
                        date: payment.processed_at || payment.created_at || new Date().toISOString(),
                        concept: `Pago - Orden #${order?.number || 'N/A'}`,
                        type: 'payment',
                        amount: payment.amount_ars || 0,
                        method: payment.method,
                        status: payment.status,
                      });
                    });
                    
                    // Ordenar por fecha (más antiguo primero para calcular saldo correctamente)
                    // Si la fecha exacta coincide, colocamos las órdenes antes que los pagos
                    transactions.sort((a, b) => {
                      const timeA = new Date(a.date).getTime();
                      const timeB = new Date(b.date).getTime();
                      if (timeA !== timeB) {
                        return timeA - timeB;
                      }
                      if (a.type === 'charge' && b.type !== 'charge') return -1;
                      if (a.type !== 'charge' && b.type === 'charge') return 1;
                      return 0;
                    });
                    
                    if (transactions.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest">
                            Sin movimientos en cuenta corriente
                          </td>
                        </tr>
                      );
                    }
                    
                    let runningBalance = 0;
                    
                    return transactions.map((transaction, index) => {
                      if (transaction.type === 'charge') {
                        runningBalance += transaction.amount;
                      } else {
                        runningBalance -= transaction.amount;
                      }
                      
                      const isOrder = transaction.type === 'charge';
                      const order = isOrder ? orders.find(o => `order-${o.id}` === transaction.id) : null;
                      const payment = !isOrder ? payments.find(p => `payment-${p.id}` === transaction.id) : null;

                      // Calcular el saldo mínimo alcanzado en el futuro (desde esta transacción en adelante).
                      // Si en algún punto el saldo futuro llega a $0 o menos, significa que esta deuda fue cancelada.
                      let minFutureBalance = runningBalance;
                      let tempBalance = runningBalance;
                      for (let j = index + 1; j < transactions.length; j++) {
                        const nextTx = transactions[j];
                        if (nextTx && nextTx.type === 'charge') {
                          tempBalance += nextTx.amount || 0;
                        } else if (nextTx) {
                          tempBalance -= nextTx.amount || 0;
                        }
                        if (tempBalance < minFutureBalance) {
                          minFutureBalance = tempBalance;
                        }
                      }

                      const canPay = isOrder && order && pendingAmount > 0 && minFutureBalance > 0 && (order.financial_status === 'pending' || order.financial_status === 'partial');
                      
                      return (
                        <tr key={transaction.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="py-5 px-8">
                            <div className="flex flex-col">
                              <span className="text-white">{formatDate(transaction.date)}</span>
                              <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{formatTime(transaction.date)}</span>
                            </div>
                          </td>
                          <td className="py-5 px-8">
                            <span className="text-white font-medium">{transaction.concept}</span>
                            {transaction.method && (
                              <span className="text-[10px] text-zinc-500 block capitalize">{transaction.method}</span>
                            )}
                            {transaction.type === 'credit_note' && (
                              <span className="text-[10px] text-blue-400 block">Nota de Crédito</span>
                            )}
                          </td>
                          <td className="py-5 px-8 text-right font-black text-red-400">
                            {transaction.type === 'charge' ? `$ ${(transaction.amount || 0).toLocaleString('es-AR')}` : '-'}
                          </td>
                          <td className="py-5 px-8 text-right font-black text-emerald-400">
                            {transaction.type === 'payment' || transaction.type === 'credit_note' ? `$ ${(transaction.amount || 0).toLocaleString('es-AR')}` : '-'}
                          </td>
                          <td className={`py-5 px-8 text-right font-black text-lg ${runningBalance > 0 ? 'text-red-400' : runningBalance < 0 ? 'text-emerald-400' : 'text-white'}`}>
                            {runningBalance > 0 
                              ? `$ ${(runningBalance || 0).toLocaleString('es-AR')}` 
                              : runningBalance < 0 
                                ? `$ ${Math.abs(runningBalance || 0).toLocaleString('es-AR')} a favor` 
                                : '$ 0'}
                          </td>
                          <td className="py-5 px-8 text-center">
                            {transaction.type === 'payment' && (
                              <button
                                onClick={() => {
                                  const order = orders.find(o => o.id === payment?.order_id);
                                  showReceiptPreviewModal({
                                    receiptId: payment?.id ? payment.id.substring(0, 8).toUpperCase() : 'REC-' + Math.floor(Math.random()*100000),
                                    orderNumber: order?.number || 0,
                                    amount: transaction.amount,
                                    method: transaction.method || 'efectivo',
                                    date: new Date(transaction.date).toLocaleString('es-AR'),
                                    customerName: customer ? (customer.nombre || `${customer.first_name || ''} ${customer.last_name || ''}`.trim()) : 'Cliente',
                                    customerDni: customer?.dni_cuit || 'No registrado',
                                    customerPhone: customer?.phone || 'No registrado',
                                    customerEmail: customer?.email || 'No registrado',
                                    previousBalance: runningBalance + transaction.amount,
                                    newBalance: runningBalance,
                                    notes: (payment as any)?.note || undefined
                                  });
                                }}
                                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1 mx-auto"
                              >
                                <span className="material-symbols-outlined text-[14px]">print</span>
                                Imprimir
                              </button>
                            )}
                            {canPay && (
                              <button
                                onClick={() => openPaymentModal(order!)}
                                className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1 mx-auto"
                              >
                                <span className="material-symbols-outlined text-[14px]">payments</span>
                                Pagar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
                <tfoot className="border-t border-white/10 bg-zinc-900/50">
                  <tr>
                    <td colSpan={5} className="py-4 px-8 text-right font-black text-white uppercase tracking-widest text-xs">Saldo Actual:</td>
                    <td className={`py-4 px-8 text-right font-black text-2xl ${pendingAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {(() => {
                        const totalCharges = orders.reduce((acc, o) => acc + (o.total_ars || 0), 0);
                        const totalPayments = payments.filter(p => p.status === 'paid').reduce((acc, p) => acc + (p.amount_ars || 0), 0);
                        const diff = totalCharges - totalPayments;
                        return diff > 0 
                          ? `$ ${(diff || 0).toLocaleString('es-AR')}` 
                          : diff < 0 
                            ? `$ ${Math.abs(diff || 0).toLocaleString('es-AR')} a favor` 
                            : '$ 0';
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* LOGÍSTICA */}
          {activeTab === 'logistics' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1E1E1E]/30 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    <th className="py-4 px-8">N° Orden</th>
                    <th className="py-4 px-8">Fecha</th>
                    <th className="py-4 px-8">Canal</th>
                    <th className="py-4 px-8 text-right">Total</th>
                    <th className="py-4 px-8 text-center">Estado Envío</th>
                    <th className="py-4 px-8 text-center">Estado Orden</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm font-data-tabular">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest">
                        Sin envíos registrados
                      </td>
                    </tr>
                  ) : filteredOrders.map((order) => {
                    const fulfillmentColor = getFulfillmentColor(order.fulfillment_status);
                    const statusColor = getStatusColor(order.status);
                    
                    return (
                      <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-5 px-8 font-black text-primary">#{order.number}</td>
                        <td className="py-5 px-8">
                          <div className="flex flex-col">
                            <span className="text-white">{formatDate(order.placed_at)}</span>
                            <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{formatTime(order.placed_at)}</span>
                          </div>
                        </td>
                        <td className="py-5 px-8">
                          <span className="text-zinc-400">{getChannelLabel(order.channel)}</span>
                        </td>
                        <td className="py-5 px-8 text-right font-black text-white">$ {(order.total_ars || 0).toLocaleString('es-AR')}</td>
                        <td className="py-5 px-8 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-${fulfillmentColor}-500/10 text-${fulfillmentColor}-400 border-${fulfillmentColor}-500/20`}>
                            <div className={`w-1.5 h-1.5 rounded-full bg-${fulfillmentColor}-400`}></div>
                            {getFulfillmentLabel(order.fulfillment_status)}
                          </span>
                        </td>
                        <td className="py-5 px-8 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-${statusColor}-500/10 text-${statusColor}-400 border-${statusColor}-500/20`}>
                            <div className={`w-1.5 h-1.5 rounded-full bg-${statusColor}-400`}></div>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="p-6 border-t border-white/5 bg-[#1E1E1E]/50 flex justify-between items-center">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Mostrando {filteredOrders.length} de {orders.length} registros
            </span>
          </div>
        </div>
      </div>

      {/* Modal Registrar Pago */}
      {showPaymentModal && selectedOrderForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Registrar Pago</h2>
                <p className="text-zinc-500 text-sm mt-1">Orden #{selectedOrderForPayment.number}</p>
              </div>
              <button 
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedOrderForPayment(null);
                  setPaymentAmount('');
                }}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-zinc-400">close</span>
              </button>
            </div>

            <form onSubmit={registerPayment} className="p-6 space-y-5">
              <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-zinc-400">Total Orden:</span>
                  <span className="text-white font-black">$ {((selectedOrderForPayment?.total_ars || 0)).toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Saldo Pendiente:</span>
                  <span className="text-amber-400 font-black">
                    $ {(() => {
                      const orderPayments = payments.filter(p => p.order_id === selectedOrderForPayment?.id && p.status === 'paid');
                      const totalPaid = orderPayments.reduce((acc, p) => acc + (p.amount_ars || 0), 0);
                      return ((selectedOrderForPayment?.total_ars || 0) - totalPaid).toLocaleString('es-AR');
                    })()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Monto a Pagar *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl font-black placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0"
                />
                <p className="text-[10px] text-zinc-500 mt-1 text-center">
                  Podés pagar el total o un monto parcial
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'efectivo', label: 'Efectivo', icon: 'payments' },
                    { id: 'tarjeta', label: 'Tarjeta', icon: 'credit_card' },
                    { id: 'transferencia', label: 'Transferencia', icon: 'account_balance' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${
                        paymentMethod === method.id 
                          ? 'bg-primary/20 border-primary text-primary' 
                          : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{method.icon}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nota (opcional)</label>
                <textarea
                  rows={2}
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Nota sobre el pago..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedOrderForPayment(null);
                    setPaymentAmount('');
                  }}
                  className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="flex-1 px-5 py-3 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">save</span>
                      Registrar Pago
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Vista Previa Recibo */}
      {showReceiptPreview && previewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Vista Previa</h2>
                <p className="text-zinc-500 text-sm mt-1">Recibo de Pago</p>
              </div>
              <button 
                onClick={() => setShowReceiptPreview(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-zinc-400">close</span>
              </button>
            </div>

            <div className="p-6">
              {/* Ticket Container */}
              <div className="bg-white text-zinc-900 rounded-2xl p-6 max-w-sm mx-auto shadow-inner border border-gray-100 font-sans relative overflow-hidden">
                {/* Decorative top bar */}
                <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
                
                <div className="text-center mb-5 pb-4 border-b border-gray-100">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-violet-100 text-violet-600 mb-2">
                    <span className="material-symbols-outlined text-xl">receipt_long</span>
                  </div>
                  <h1 className="text-base font-black uppercase tracking-wider text-zinc-950">RECIBO DE PAGO</h1>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Obsidiana POS</p>
                  <p className="text-[11px] font-black text-violet-600 mt-1 bg-violet-50 px-2.5 py-0.5 rounded-full inline-block">Nº {previewReceipt.receiptId}</p>
                </div>
                
                <div className="space-y-4 text-xs">
                  {/* Detalle del Pago */}
                  <div>
                    <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 border-b border-gray-50 pb-0.5">Detalles del Comprobante</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Fecha y Hora:</span>
                        <span className="font-semibold text-zinc-800">{previewReceipt.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Orden vinculada:</span>
                        <span className="font-semibold text-zinc-800">#{previewReceipt.orderNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Método de pago:</span>
                        <span className="font-semibold text-zinc-800 capitalize">{previewReceipt.method}</span>
                      </div>
                      {previewReceipt.notes && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Observaciones:</span>
                          <span className="font-semibold text-zinc-800 italic">{previewReceipt.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Datos del Cliente */}
                  <div>
                    <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 border-b border-gray-50 pb-0.5">Datos del Cliente</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Nombre:</span>
                        <span className="font-semibold text-zinc-800">{previewReceipt.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">DNI / CUIT:</span>
                        <span className="font-semibold text-zinc-800">{previewReceipt.customerDni}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Teléfono:</span>
                        <span className="font-semibold text-zinc-800">{previewReceipt.customerPhone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Email:</span>
                        <span className="font-semibold text-zinc-800 truncate max-w-[180px]">{previewReceipt.customerEmail}</span>
                      </div>
                    </div>
                  </div>

                  {/* Estado de Cuenta */}
                  <div>
                    <h3 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 border-b border-gray-50 pb-0.5">Resumen de Cuenta</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Saldo anterior:</span>
                        <span className="font-semibold text-zinc-700">$ {(previewReceipt?.previousBalance ?? 0).toLocaleString('es-AR')}</span>
                      </div>
                      <div className="flex justify-between font-bold text-zinc-900 border-t border-dashed border-gray-100 pt-1.5">
                        <span>Monto abonado:</span>
                        <span>$ {(previewReceipt?.amount ?? 0).toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`mt-4 p-3 rounded-xl border text-center ${
                  (previewReceipt?.newBalance ?? 0) > 0 
                    ? 'bg-red-50 border-red-100 text-red-700' 
                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                }`}>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-85">
                    {(previewReceipt?.newBalance ?? 0) > 0 ? 'Saldo Pendiente Restante' : 'Saldo a Favor Restante'}
                  </p>
                  <p className="text-lg font-black mt-0.5">
                    $ {Math.abs(previewReceipt?.newBalance ?? 0).toLocaleString('es-AR')}
                  </p>
                </div>
                
                <div className="text-center mt-5 pt-3 border-t border-dashed border-gray-100 text-[9px] text-zinc-400 font-medium">
                  <p>Documento de control interno no válido como factura fiscal</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowReceiptPreview(false)}
                  className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-sm"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    printPaymentReceipt(previewReceipt);
                    setShowReceiptPreview(false);
                  }}
                  className="flex-1 px-5 py-3 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-bold text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">print</span>
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
