'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

interface DailySummary {
  date: string;
  totalSales: number;
  orderCount: number;
  cashSales: number;
  mpSales: number;
  cardSales: number;
  otherSales: number;
}

export default function SalesPage() {
  const { tenant } = useTenant();
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    if (tenant?.id) fetchSales();
  }, [tenant, dateRange]);

  async function fetchSales() {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('id, total_ars, payment_method, placed_at, channel')
        .eq('tenant_id', tenant.id)
        .eq('channel', 'pos')
        .order('placed_at', { ascending: false });

      // Apply date filter
      if (dateRange === '7d') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte('placed_at', sevenDaysAgo.toISOString());
      } else if (dateRange === '30d') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('placed_at', thirtyDaysAgo.toISOString());
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Group by date
      const byDate = new Map<string, DailySummary>();
      
      (orders || []).forEach(order => {
        const dateStr = new Date(order.placed_at).toLocaleDateString('es-AR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

        if (!byDate.has(dateStr)) {
          byDate.set(dateStr, {
            date: dateStr,
            totalSales: 0,
            orderCount: 0,
            cashSales: 0,
            mpSales: 0,
            cardSales: 0,
            otherSales: 0,
          });
        }

        const summary = byDate.get(dateStr)!;
        summary.totalSales += order.total_ars || 0;
        summary.orderCount += 1;
        
        const method = order.payment_method?.toLowerCase() || '';
        if (method === 'efectivo') summary.cashSales += order.total_ars || 0;
        else if (method === 'mercadopago') summary.mpSales += order.total_ars || 0;
        else if (method === 'tarjeta') summary.cardSales += order.total_ars || 0;
        else summary.otherSales += order.total_ars || 0;
      });

      setSummaries(Array.from(byDate.values()));
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  }

  const kpis = useMemo(() => {
    const totalRevenue = summaries.reduce((s, d) => s + d.totalSales, 0);
    const totalOrders = summaries.reduce((s, d) => s + d.orderCount, 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const daysWithSales = summaries.filter(d => d.totalSales > 0).length;
    return { totalRevenue, totalOrders, avgTicket, daysWithSales };
  }, [summaries]);

  const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);

  return (
    <main className="flex-1 lg:ml-64 p-4 md:p-8 bg-background min-h-screen max-w-[1440px] mx-auto w-full">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-outline font-label-md text-[11px] uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-[14px]">point_of_sale</span>
            <span>Terminales</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary">Cierres Z</span>
          </div>
          <h2 className="font-headline-xl text-headline-xl text-on-background tracking-tight">Historial de Ventas POS</h2>
          <p className="font-body-sm text-body-sm text-outline mt-1">Resumen diario de ventas registradas en el punto de venta.</p>
        </div>
        <div className="flex items-center gap-3">
          {(['7d', '30d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg font-label-md text-label-md uppercase transition-colors ${
                dateRange === range
                  ? 'bg-primary-container/20 border-primary-container/50 text-primary'
                  : 'bg-surface-container-high border-outline-variant/30 text-on-surface-variant hover:text-on-background hover:bg-surface-container-highest'
              }`}
            >
              {range === '7d' ? 'Últimos 7 Días' : range === '30d' ? 'Últimos 30 Días' : 'Todo'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary-container"></div>
          <div>
            <p className="font-label-md text-label-md text-outline uppercase">Facturación Total</p>
            <h3 className="font-headline-xl text-headline-xl text-on-background mt-1">{fmt(kpis.totalRevenue)}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary-container">payments</span>
          </div>
        </div>
        <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div>
            <p className="font-label-md text-label-md text-outline uppercase">Total Operaciones</p>
            <h3 className="font-headline-xl text-headline-xl text-on-background mt-1">{kpis.totalOrders}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined">receipt_long</span>
          </div>
        </div>
        <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <div>
            <p className="font-label-md text-label-md text-outline uppercase">Ticket Promedio</p>
            <h3 className="font-headline-xl text-headline-xl text-on-background mt-1">{fmt(kpis.avgTicket)}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
            <span className="material-symbols-outlined">analytics</span>
          </div>
        </div>
        <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <div>
            <p className="font-label-md text-label-md text-outline uppercase">Días con Ventas</p>
            <h3 className="font-headline-xl text-headline-xl text-on-background mt-1">{kpis.daysWithSales}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
            <span className="material-symbols-outlined">calendar_month</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant/10 text-outline font-label-md text-[11px] uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Fecha</th>
                <th className="px-6 py-3 font-semibold text-right">Operaciones</th>
                <th className="px-6 py-3 font-semibold text-right">Efectivo</th>
                <th className="px-6 py-3 font-semibold text-right">MercadoPago</th>
                <th className="px-6 py-3 font-semibold text-right">Tarjeta</th>
                <th className="px-6 py-3 font-semibold text-right">Total del Día</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm font-data-tabular">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-3xl animate-spin">autorenew</span>
                      <span className="font-black text-[10px] uppercase tracking-widest">Cargando ventas...</span>
                    </div>
                  </td>
                </tr>
              ) : summaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-4xl">point_of_sale</span>
                      <span className="font-black text-[10px] uppercase tracking-widest">No hay ventas POS en este período</span>
                      <p className="text-zinc-600 text-xs max-w-sm">Las ventas realizadas desde el terminal POS aparecerán aquí automáticamente.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                summaries.map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary-container text-[16px]">event</span>
                        </div>
                        <span className="text-on-background font-medium">{row.date}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full text-xs font-bold text-white">
                        {row.orderCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-400">{row.cashSales > 0 ? fmt(row.cashSales) : '—'}</td>
                    <td className="px-6 py-4 text-right text-blue-400">{row.mpSales > 0 ? fmt(row.mpSales) : '—'}</td>
                    <td className="px-6 py-4 text-right text-orange-400">{row.cardSales > 0 ? fmt(row.cardSales) : '—'}</td>
                    <td className="px-6 py-4 text-right text-on-background font-bold text-base">{fmt(row.totalSales)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {summaries.length > 0 && (
          <div className="p-4 border-t border-outline-variant/10 bg-surface-container-high flex items-center justify-between text-xs text-outline">
            <span>Mostrando {summaries.length} {summaries.length === 1 ? 'día' : 'días'} con ventas</span>
            <div className="flex items-center gap-4">
              <span className="text-emerald-400 font-bold">Efectivo: {fmt(summaries.reduce((s, d) => s + d.cashSales, 0))}</span>
              <span className="text-blue-400 font-bold">MP: {fmt(summaries.reduce((s, d) => s + d.mpSales, 0))}</span>
              <span className="text-orange-400 font-bold">Tarjeta: {fmt(summaries.reduce((s, d) => s + d.cardSales, 0))}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
