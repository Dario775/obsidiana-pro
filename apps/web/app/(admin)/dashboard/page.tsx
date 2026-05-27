'use client';

import React, { useEffect, useState } from 'react';
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
}

export default function AdminHomePage() {
  const { tenant, plan } = useTenant();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [criticalStock, setCriticalStock] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, [tenant]);

  async function fetchDashboardData() {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      // 1. Fetch recent orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, number, total_ars, subtotal_ars, tax_ars, status, financial_status, channel, placed_at')
        .eq('tenant_id', tenant.id)
        .order('placed_at', { ascending: false })
        .limit(20);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      } else {
        setOrders(ordersData || []);
      }

      // 2. Fetch critical stock
      const { data: inventoryData, error: invError } = await supabase
        .from('inventory_levels')
        .select('available')
        .eq('tenant_id', tenant.id);

      if (invError) {
        console.error('Error fetching inventory:', invError);
      } else {
        const criticalCount = (inventoryData || []).filter((inv: any) => inv.available <= 0).length;
        setCriticalStock(criticalCount);
      }

    } catch (error) {
      console.error('Error in fetchDashboardData:', error);
    } finally {
      setLoading(false);
    }
  }

  // Analytics Calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = orders.filter(o => {
    const d = new Date(o.placed_at);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  const dailySales = todayOrders.reduce((acc, o) => acc + (o.total_ars || 0), 0);
  const avgTicket = todayOrders.length > 0 ? dailySales / todayOrders.length : 0;

  // Recent 5 orders for table
  const recentOrders = orders.slice(0, 5);

  // Formatting date
  const nowFormatted = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date());

  // Week Chart Calculation
  const weekData = [
    { day: 'Lun', pos: 0, online: 0 },
    { day: 'Mar', pos: 0, online: 0 },
    { day: 'Mie', pos: 0, online: 0 },
    { day: 'Jue', pos: 0, online: 0 },
    { day: 'Vie', pos: 0, online: 0 },
    { day: 'Sab', pos: 0, online: 0 },
    { day: 'Dom', pos: 0, online: 0 }
  ];

  const weekDayMap = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
  
  orders.forEach(order => {
    const d = new Date(order.placed_at);
    const dayName = weekDayMap[d.getDay()];
    const chartDay = weekData.find(w => w.day === dayName);
    if (chartDay) {
      if (order.channel === 'pos') {
        chartDay.pos += order.total_ars || 0;
      } else {
        chartDay.online += order.total_ars || 0;
      }
    }
  });

  // Maximum value for scaling the weekly chart
  const maxWeeklyValue = Math.max(...weekData.map(w => Math.max(w.pos, w.online)), 100);

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-10 pb-32">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -ml-48 -mt-48 pointer-events-none group-hover:bg-primary/15 transition-all duration-1000"></div>
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
              {/* Plan Badge */}
              <a 
                href="/settings/billing"
                className={`px-3 py-1 rounded-full ${plan?.id === 'free' ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' : 'bg-violet-500/10 text-violet-400 border-violet-500/20'} border font-semibold text-[10px] uppercase tracking-wider flex items-center gap-2 hover:bg-violet-500/20 transition-all cursor-pointer group/plan`}
              >
                <span className="material-symbols-outlined text-[12px] group-hover/plan:rotate-12 transition-transform">{plan?.id === 'free' ? 'auto_awesome' : 'workspace_premium'}</span>
                Plan: {plan?.name || plan?.nombre || 'Cargando...'}
              </a>

              {/* Status & Days Remaining */}
              <a 
                href="/settings/billing"
                className={`px-3 py-1 rounded-full ${
                  tenant?.paid_until && new Date(tenant.paid_until) > new Date() 
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20' 
                    : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                } border font-semibold text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer`}
              >
                <span className="material-symbols-outlined text-[12px]">event</span>
                {tenant?.paid_until ? (
                  new Date(tenant.paid_until) > new Date() 
                    ? `${Math.ceil((new Date(tenant.paid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días restantes`
                    : 'Suscripción Vencida'
                ) : plan?.id === 'free' ? (
                  'Acceso Vitalicio'
                ) : 'Estado Desconocido'}
              </a>

              <span className="text-zinc-500 font-medium text-[10px] uppercase tracking-widest">Última sincronización: En tiempo real</span>
           </div>
          <h1 className="font-headline-xl text-3xl font-bold text-white tracking-tight">Panel de Control</h1>
          <p className="text-zinc-400 font-normal text-sm mt-2">
            Resumen operativo de <span className="text-white font-semibold">{tenant?.nombre || 'Mi Tienda'}</span> — Análisis en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button className="px-5 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800 transition-all font-semibold text-[11px] uppercase tracking-wider flex items-center gap-2.5 active:scale-95 group">
            <span className="material-symbols-outlined text-[18px] text-zinc-500 group-hover:text-white transition-colors">calendar_today</span>
            Hoy, {nowFormatted}
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Ventas del Día', value: `$ ${dailySales.toLocaleString('es-AR')}`, sub: 'ARS', trend: `+${todayOrders.length} hoy`, icon: 'payments', color: 'primary' },
          { label: 'Pedidos Hoy', value: `${todayOrders.length}`, sub: 'órdenes', trend: 'procesadas hoy', icon: 'shopping_cart', color: 'secondary' },
          { label: 'Stock Crítico', value: `${criticalStock}`, sub: 'SKUs', trend: criticalStock > 0 ? 'Acción requerida' : 'Sin problemas', icon: 'warning', color: criticalStock > 0 ? 'red' : 'emerald' },
          { label: 'Ticket Promedio', value: `$ ${Math.round(avgTicket).toLocaleString('es-AR')}`, sub: 'ARS', trend: 'Hoy', icon: 'receipt', color: 'amber' },
        ].map((kpi, i) => (
          <div key={i} className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all shadow-xl">
             <div className={`absolute -top-4 -right-4 w-24 h-24 bg-${kpi.color === 'red' ? 'red-500' : kpi.color === 'amber' ? 'amber-500' : kpi.color === 'emerald' ? 'emerald-500' : 'primary'}/5 rounded-full blur-2xl group-hover:bg-${kpi.color === 'red' ? 'red-500' : kpi.color === 'amber' ? 'amber-500' : kpi.color === 'emerald' ? 'emerald-500' : 'primary'}/10 transition-all duration-700`}></div>
             <div className="flex flex-col gap-4 relative z-10">
                <div className="flex items-center justify-between">
                   <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">{kpi.label}</span>
                   <span className={`material-symbols-outlined text-xl text-${kpi.color === 'red' ? 'red-500' : kpi.color === 'amber' ? 'amber-500' : kpi.color === 'emerald' ? 'emerald-500' : 'primary'}-500/50 group-hover:scale-110 transition-transform`}>{kpi.icon}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                   <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{loading ? '...' : kpi.value}</span>
                   <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{kpi.sub}</span>
                </div>
                <div className={`flex items-center gap-1.5 font-semibold text-[10px] uppercase tracking-wider ${kpi.color === 'red' ? 'text-red-400' : 'text-emerald-400'}`}>
                   <span className="material-symbols-outlined text-[12px]">{kpi.color === 'red' ? 'arrow_downward' : 'trending_up'}</span>
                   {kpi.trend}
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Main Insights Area */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Weekly Performance Chart */}
        <div className="xl:col-span-8 bg-[#1A1A1A] rounded-2xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
           
           <div className="flex justify-between items-center mb-10 relative z-10">
              <div>
                 <h3 className="text-lg font-bold text-white tracking-tight">Rendimiento Semanal</h3>
                 <p className="text-xs font-normal text-zinc-500 mt-1">Ventas consolidadas POS + Online</p>
              </div>
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary-container"></div>
                    <span className="text-xs font-medium text-zinc-400">POS</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-secondary-container"></div>
                    <span className="text-xs font-medium text-zinc-400">Online</span>
                 </div>
              </div>
           </div>

           <div className="h-[320px] flex items-end justify-between gap-4 px-4 relative z-10">
              {weekData.map((data, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-4 group/bar">
                   <div className="w-full flex items-end gap-1.5 h-[260px] px-1">
                      <div className="flex-1 bg-primary-container/20 border-t border-x border-primary-container/30 rounded-t-lg group-hover/bar:bg-primary-container/40 transition-all relative group/val" style={{ height: `${(data.pos / maxWeeklyValue) * 100}%` }}>
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-xl opacity-0 group-hover/val:opacity-100 transition-all pointer-events-none shadow-2xl z-20">
                            <span className="text-white font-semibold text-xs whitespace-nowrap">${data.pos.toLocaleString('es-AR')}</span>
                         </div>
                      </div>
                      <div className="flex-1 bg-secondary-container/20 border-t border-x border-secondary-container/30 rounded-t-lg group-hover/bar:bg-secondary-container/40 transition-all relative group/val" style={{ height: `${(data.online / maxWeeklyValue) * 100}%` }}>
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-xl opacity-0 group-hover/val:opacity-100 transition-all pointer-events-none shadow-2xl z-20">
                            <span className="text-white font-semibold text-xs whitespace-nowrap">${data.online.toLocaleString('es-AR')}</span>
                         </div>
                      </div>
                   </div>
                   <span className="text-xs font-semibold text-zinc-500 tracking-wider group-hover/bar:text-white transition-colors">{data.day}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Recent Orders Side Table */}
        <div className="xl:col-span-4 flex flex-col gap-8">
           <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/5 shadow-2xl flex flex-col gap-6 relative overflow-hidden group">
              <div className="flex items-center justify-between relative z-10">
                 <h3 className="font-bold text-sm text-white tracking-wide">Pedidos Recientes</h3>
                 <button 
                   onClick={() => window.location.href = '/pos/sales'}
                   className="text-primary-container hover:text-white transition-colors font-semibold text-xs tracking-wider flex items-center gap-1.5 group/btn"
                 >
                    Ver todos
                    <span className="material-symbols-outlined text-[14px] group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                 </button>
              </div>
              
              <div className="flex flex-col gap-4 relative z-10">
                 {loading ? (
                   <div className="text-zinc-500 font-medium text-sm text-center py-10 animate-pulse">Cargando pedidos...</div>
                 ) : recentOrders.length === 0 ? (
                   <div className="text-zinc-500 font-medium text-sm text-center py-10">No hay pedidos registrados</div>
                 ) : recentOrders.map((order, i) => {
                   const isPaid = order.financial_status === 'paid';
                   return (
                     <div key={i} className="flex items-center justify-between p-3.5 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-white/10 hover:bg-zinc-900 transition-all group/item">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-white/5 flex items-center justify-center font-semibold text-xs text-zinc-500 group-hover/item:text-primary-container transition-colors">
                              {order.number || '—'}
                           </div>
                           <div>
                              <p className="text-sm font-semibold text-white leading-none">#{order.number}</p>
                              <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mt-1">{order.channel === 'pos' ? 'Punto de Venta' : 'Tienda Web'}</p>
                           </div>
                        </div>
                        <div className="flex flex-col items-end">
                           <p className="text-sm font-semibold text-white">$ {(order.total_ars || 0).toLocaleString('es-AR')}</p>
                           <span className={`text-[10px] font-semibold uppercase tracking-wider mt-1 ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
                             {isPaid ? 'Pagado' : 'Pendiente'}
                           </span>
                        </div>
                     </div>
                   );
                 })}
              </div>
           </div>

           {/* Quick Actions / Store Status */}
           <div className="bg-primary-container rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/20 transition-all duration-700"></div>
              <div className="relative z-10">
                 <h4 className="text-white font-bold text-sm tracking-wide mb-4">Acciones Rápidas</h4>
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => window.location.href = '/pos'}
                      className="bg-white/10 hover:bg-white/20 transition-all p-3.5 rounded-xl border border-white/10 flex flex-col items-center gap-2 group/act"
                    >
                       <span className="material-symbols-outlined text-white group-hover:scale-110 transition-transform">add_shopping_cart</span>
                       <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Nueva Venta</span>
                    </button>
                    <button 
                      onClick={() => window.location.href = '/inventory'}
                      className="bg-white/10 hover:bg-white/20 transition-all p-3.5 rounded-xl border border-white/10 flex flex-col items-center gap-2 group/act"
                    >
                       <span className="material-symbols-outlined text-white group-hover:scale-110 transition-transform">inventory</span>
                       <span className="text-[10px] font-semibold text-white uppercase tracking-wider">Ajuste Stock</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
