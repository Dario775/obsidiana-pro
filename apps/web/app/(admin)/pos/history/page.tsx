'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

interface CashSession {
  id: string;
  name: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  initial_amount: number;
  expected_amount: number;
  actual_amount: number;
  difference: number;
  total_sales: number;
  operations_count: number;
  sales_breakdown: Record<string, number>;
  arca_status: string;
  arca_report_id: string | null;
  notes: string | null;
  user_id: string;
}

export default function CashHistoryPage() {
  const { tenant } = useTenant();
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal for detail view
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null);

  useEffect(() => {
    if (tenant?.id) {
      fetchSessions();
    }
  }, [tenant]);

  async function fetchSessions() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching cash sessions history:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.arca_report_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sessions, searchQuery]);

  // Statistics for cards
  const stats = useMemo(() => {
    // Filter sessions from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = sessions.filter(s => new Date(s.opened_at) >= sevenDaysAgo);

    const totalRevenue = recentSessions.reduce((sum, s) => sum + (Number(s.total_sales) || 0), 0);
    const discrepanciesCount = recentSessions.filter(s => Math.abs(Number(s.difference)) > 0).length;
    
    const approvedCount = sessions.filter(s => s.arca_status === 'approved').length;
    const totalWithArca = sessions.filter(s => s.arca_status !== 'none').length;
    const syncPercentage = totalWithArca > 0 ? Math.round((approvedCount / totalWithArca) * 100) : 100;

    return {
      totalRevenue,
      discrepanciesCount,
      syncPercentage
    };
  }, [sessions]);

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 font-label-md text-[10px] uppercase tracking-widest mb-2 font-black">
            <span className="material-symbols-outlined text-[14px]">point_of_sale</span>
            Terminales
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-black">Cierres Z</span>
          </div>
          <h1 className="font-headline-xl text-3xl font-black text-white mb-1">Historial de Cierres de Caja</h1>
          <p className="text-zinc-400 font-body-sm text-sm max-w-2xl">Registro auditable de sesiones de terminal, arqueos de caja y sincronización ARCA.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={fetchSessions}
            className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-label-md text-xs uppercase font-bold tracking-wider flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Actualizar
          </button>
        </div>
      </div>

      {/* Bento Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-primary/20 transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary-container"></div>
          <div className="flex justify-between items-start mb-4">
            <p className="font-black text-[10px] text-zinc-500 uppercase tracking-widest">Facturación Total (7D)</p>
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">payments</span>
            </div>
          </div>
          <div>
            <h3 className="font-data-tabular text-3xl font-black text-white tracking-tight">
              $ {stats.totalRevenue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-emerald-400">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span className="font-black text-[10px] uppercase tracking-tighter">Últimos 7 días de turnos</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-red-500/20 transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
          <div className="flex justify-between items-start mb-4">
            <p className="font-black text-[10px] text-zinc-500 uppercase tracking-widest">Descuadres Detectados (7D)</p>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <span className="material-symbols-outlined text-[20px]">balance</span>
            </div>
          </div>
          <div>
            <h3 className="font-data-tabular text-3xl font-black text-white tracking-tight">
              {stats.discrepanciesCount}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-red-500">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              <span className="font-black text-[10px] uppercase tracking-tighter text-red-400">Arqueos con diferencia</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-blue-400/20 transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <div className="flex justify-between items-start mb-4">
            <p className="font-black text-[10px] text-zinc-500 uppercase tracking-widest">Sincronización ARCA</p>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-[20px]">cloud_done</span>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight leading-tight">
              {stats.syncPercentage}% Sincronizado
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-zinc-500">
              <span className="font-black text-[10px] uppercase tracking-tighter">Reportes fiscales transmitidos</span>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 bg-[#1E1E1E]/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80 group">
             <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors text-lg">search</span>
             <input 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white font-medium focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-600" 
               placeholder="Buscar por Caja, Reporte o Nota..." 
               type="text" 
             />
          </div>
        </div>
        
        {loading ? (
          <div className="p-20 text-center text-zinc-500 flex flex-col gap-3 items-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Cargando historial de caja...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-20 text-center text-zinc-500 flex flex-col gap-2 items-center">
            <span className="material-symbols-outlined text-4xl">history_toggle_off</span>
            <span className="text-sm font-bold">No se encontraron cierres de caja</span>
            <span className="text-xs text-zinc-600">Asegúrate de que los cajeros hayan realizado cierres Z.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1E1E1E]/30 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  <th className="py-4 px-8">Apertura / Cierre</th>
                  <th className="py-4 px-8">Terminal</th>
                  <th className="py-4 px-8">Operador</th>
                  <th className="py-4 px-8 text-right">Total Facturado</th>
                  <th className="py-4 px-8 text-right">Diferencia</th>
                  <th className="py-4 px-8 text-center">Estado ARCA</th>
                  <th className="py-4 px-8 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-data-tabular text-white">
                {filteredSessions.map((row) => {
                  const isClosed = row.status === 'closed';
                  const dateStr = isClosed && row.closed_at 
                    ? new Date(row.closed_at).toLocaleDateString()
                    : new Date(row.opened_at).toLocaleDateString();
                  const timeStr = isClosed && row.closed_at
                    ? new Date(row.closed_at).toLocaleTimeString()
                    : 'Activa (Abierta)';
                               const isDiffNegative = Number(row.difference) < 0;
                  const isDiffZero = Number(row.difference) === 0;

                  const efectivo = Number(row.sales_breakdown?.efectivo || 0);
                  const tarjeta = Number(row.sales_breakdown?.tarjeta || 0);
                  const mercadopago = Number(row.sales_breakdown?.mercadopago || 0);
                  const transferencia = Number(row.sales_breakdown?.transferencia || 0);
                  const directSales = efectivo + tarjeta + mercadopago + transferencia;
                  const creditSales = Math.max(0, Number(row.total_sales || 0) - directSales);

                  return (
                    <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-5 px-8">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{dateStr}</span>
                          <span className="text-zinc-650 text-[11px] font-black tracking-widest">{timeStr}</span>
                        </div>
                      </td>
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <span className="material-symbols-outlined text-[18px] text-zinc-600">point_of_sale</span>
                          <span className="font-black text-xs">{row.name}</span>
                        </div>
                      </td>
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-zinc-800 text-primary-container flex items-center justify-center text-[10px] font-black border border-white/5 uppercase">
                            OP
                          </div>
                          <span className="font-medium text-zinc-300">Operador POS</span>
                        </div>
                      </td>
                      <td className="py-5 px-8 text-right">
                        <div className="flex flex-col text-right font-data-tabular">
                          <span className="font-black text-white">$ {(Number(row.total_sales) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[10px] text-zinc-500 font-bold flex items-center justify-end gap-1.5 mt-0.5 uppercase tracking-tighter">
                            {creditSales > 0 ? (
                              <>
                                <span className="text-emerald-400">Contado: ${(directSales).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                                <span className="text-zinc-600">|</span>
                                <span className="text-amber-400">Crédito: ${(creditSales).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                              </>
                            ) : (
                              <span className="text-zinc-500">100% Contado</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-8 text-right">
                        {!isClosed ? (
                          <span className="text-zinc-600 text-xs">Abierta</span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black ${
                            isDiffZero 
                              ? 'text-emerald-400 bg-emerald-400/10' 
                              : isDiffNegative
                                ? 'text-red-400 bg-red-400/10 border border-red-400/20'
                                : 'text-amber-400 bg-amber-400/10 border border-amber-400/20'
                          }`}>
                            $ {(Number(row.difference) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>
                      <td className="py-5 px-8 text-center">
                        {row.arca_status === 'approved' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Aprobado
                          </span>
                        ) : row.status === 'open' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-zinc-800 text-zinc-400 border-white/5">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse"></span>
                            Pendiente Cierre
                          </span>
                        ) : row.arca_status === 'none' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-zinc-950 text-zinc-500 border-white/5">
                            Local
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-amber-500/10 text-amber-400 border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            Pendiente ARCA
                          </span>
                        )}
                      </td>
                      <td className="py-5 px-8 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => setSelectedSession(row)}
                            className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-black uppercase tracking-widest rounded-lg"
                          >
                            Detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Ticket Modal Overlay */}
      {selectedSession && (() => {
        const modalEfectivo = Number(selectedSession.sales_breakdown?.efectivo || 0);
        const modalTarjeta = Number(selectedSession.sales_breakdown?.tarjeta || 0);
        const modalMercadopago = Number(selectedSession.sales_breakdown?.mercadopago || 0);
        const modalTransferencia = Number(selectedSession.sales_breakdown?.transferencia || 0);
        const modalDirectSales = modalEfectivo + modalTarjeta + modalMercadopago + modalTransferencia;
        const modalCreditSales = Math.max(0, Number(selectedSession.total_sales || 0) - modalDirectSales);

        return (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl p-6 shadow-2xl max-w-md w-full flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedSession(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {/* Header info */}
            <div className="flex flex-col items-center text-center gap-1">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-2xl">receipt_long</span>
              </div>
              <h2 className="text-lg font-black text-white tracking-tight uppercase mt-2">Detalle de Cierre Z</h2>
              <p className="text-xs text-zinc-500">ID Sesión: {selectedSession.id.substring(0, 8)}...</p>
            </div>

            {/* Receipt Ticket Box */}
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-5 font-mono text-xs text-zinc-300 flex flex-col gap-4 shadow-inner">
              <div className="flex flex-col items-center text-center border-b border-white/10 pb-4">
                <span className="font-black tracking-tighter text-sm text-white uppercase">OBSIDIANA POS</span>
                <span className="text-[10px] text-zinc-500">Auditoría Cierre de Caja</span>
                <span className="text-[10px] text-zinc-400 mt-2">
                  Apertura: {new Date(selectedSession.opened_at).toLocaleString()}
                </span>
                {selectedSession.closed_at && (
                  <span className="text-[10px] text-zinc-400">
                    Cierre: {new Date(selectedSession.closed_at).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5 border-b border-white/5 pb-3">
                <div className="flex justify-between">
                  <span>Terminal:</span>
                  <span className="font-bold text-white">{selectedSession.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <span className="font-bold text-white">{selectedSession.status.toUpperCase()}</span>
                </div>
                {selectedSession.arca_status !== 'none' && (
                  <div className="flex justify-between">
                    <span>ARCA Z-Report:</span>
                    <span className="font-bold text-white">{selectedSession.arca_report_id || 'PENDIENTE'}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 border-b border-white/5 pb-3">
                <div className="flex justify-between">
                  <span>Efectivo Inicial:</span>
                  <span>$ {parseFloat(String(selectedSession.initial_amount || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Efectivo Ventas:</span>
                  <span>$ {parseFloat(String(selectedSession.sales_breakdown?.efectivo || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                {(selectedSession.sales_breakdown?.repayment_efectivo || 0) > 0 && (
                  <div className="flex justify-between text-zinc-400 pl-2">
                    <span>└ Cobros Cta Cte:</span>
                    <span>$ {parseFloat(String(selectedSession.sales_breakdown?.repayment_efectivo || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white">
                  <span>Efectivo Esperado:</span>
                  <span>$ {parseFloat(String(selectedSession.expected_amount || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-white">
                  <span>Efectivo Contado:</span>
                  <span>$ {parseFloat(String(selectedSession.actual_amount || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className={`flex justify-between font-bold ${parseFloat(String(selectedSession.difference || 0)) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  <span>Diferencia:</span>
                  <span>$ {parseFloat(String(selectedSession.difference || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 border-b border-white/5 pb-3">
                <div className="flex justify-between">
                  <span>Ventas Tarjeta:</span>
                  <span>$ {parseFloat(String(selectedSession.sales_breakdown?.tarjeta || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                {(selectedSession.sales_breakdown?.repayment_tarjeta || 0) > 0 && (
                  <div className="flex justify-between text-zinc-400 pl-2">
                    <span>└ Cobros Cta Tarjeta:</span>
                    <span>$ {parseFloat(String(selectedSession.sales_breakdown?.repayment_tarjeta || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Ventas Mercado Pago:</span>
                  <span>$ {parseFloat(String(selectedSession.sales_breakdown?.mercadopago || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                {(selectedSession.sales_breakdown?.repayment_mercadopago || 0) > 0 && (
                  <div className="flex justify-between text-zinc-400 pl-2">
                    <span>└ Cobros Cta MP:</span>
                    <span>$ {parseFloat(String(selectedSession.sales_breakdown?.repayment_mercadopago || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Transferencias:</span>
                  <span>$ {parseFloat(String(selectedSession.sales_breakdown?.transferencia || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                {(selectedSession.sales_breakdown?.repayment_transferencia || 0) > 0 && (
                  <div className="flex justify-between text-zinc-400 pl-2">
                    <span>└ Cobros Cta Transf:</span>
                    <span>$ {parseFloat(String(selectedSession.sales_breakdown?.repayment_transferencia || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-400 text-[11px] pl-2 border-t border-white/5 pt-2">
                  <span>└ Ventas Contado:</span>
                  <span>$ {parseFloat(String(modalDirectSales || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-zinc-400 text-[11px] pl-2">
                  <span>└ Ventas a Crédito:</span>
                  <span className={modalCreditSales > 0 ? "text-amber-400 font-bold" : ""}>$ {parseFloat(String(modalCreditSales || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-white pt-1.5 border-t border-white/10">
                  <span>Total Facturado:</span>
                  <span>$ {parseFloat(String(selectedSession.total_sales || 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 text-[10px] text-zinc-500 pt-2">
                <div className="flex justify-between">
                  <span>Operaciones:</span>
                  <span>{selectedSession.operations_count} ventas</span>
                </div>
                {selectedSession.notes && (
                  <div className="mt-1 flex flex-col">
                    <span>Notas/Observaciones:</span>
                    <span className="text-zinc-400 italic">"{selectedSession.notes}"</span>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => setSelectedSession(null)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      );
    })()}
  </div>
);
}
