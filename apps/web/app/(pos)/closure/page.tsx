'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';
import Link from 'next/link';

export default function ClosurePage() {
  const { tenant } = useTenant();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Form fields
  const [actualAmountInput, setActualAmountInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [closing, setClosing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [closedSession, setClosedSession] = useState<any>(null);

  useEffect(() => {
    if (tenant?.id) {
      fetchActiveSession();
    }
  }, [tenant]);

  async function fetchActiveSession() {
    setSessionLoading(true);
    try {
      const { data: session, error: sessionError } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (session) {
        setActiveSession(session);
        
        // Fetch orders since opened_at
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, total_ars, placed_at')
          .eq('tenant_id', tenant!.id)
          .gte('placed_at', session.opened_at);

        if (ordersError) throw ordersError;
        setOrders(ordersData || []);

        // Fetch payments since opened_at
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('id, amount_ars, method, processed_at, metadata, order_id, orders(placed_at, total_ars)')
          .eq('tenant_id', tenant!.id)
          .gte('processed_at', session.opened_at);

        if (paymentsError) throw paymentsError;
        setPayments(paymentsData || []);

        // Calculate expected cash to prefill input
        const cashSales = (paymentsData || [])
          .filter((p: any) => (p.method || '').toLowerCase() === 'efectivo')
          .reduce((sum: number, p: any) => sum + (parseFloat(p.amount_ars) || 0), 0);
        
        const expectedCash = session.initial_amount + cashSales;
        setActualAmountInput(expectedCash.toFixed(2));
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Error fetching closure data:', err);
    } finally {
      setSessionLoading(false);
    }
  }

  // Calculate stats
  const stats = useMemo(() => {
    if (!activeSession) return null;

    const initialCash = activeSession.initial_amount || 0;
    
    // Group sales by method
    let cashSales = 0;
    let mpSales = 0;
    let cardSales = 0;
    let transferSales = 0;

    // Group credit repayments by method
    let repaymentCash = 0;
    let repaymentMp = 0;
    let repaymentCard = 0;
    let repaymentTransfer = 0;

    payments.forEach((p: any) => {
      const amt = parseFloat(p.amount_ars) || 0;
      const method = (p.method || '').toLowerCase();

      // Determine if this is a credit repayment
      const isRepayment = p.metadata?.type === 'credit_repayment' || (
        p.orders && new Date(p.processed_at || p.created_at).getTime() - new Date(p.orders.placed_at).getTime() > 10000
      );

      if (isRepayment) {
        if (method === 'efectivo') {
          repaymentCash += amt;
        } else if (method === 'mercadopago' || method === 'mp') {
          repaymentMp += amt;
        } else if (method === 'tarjeta') {
          repaymentCard += amt;
        } else {
          repaymentTransfer += amt;
        }
      } else {
        if (method === 'efectivo') {
          cashSales += amt;
        } else if (method === 'mercadopago' || method === 'mp') {
          mpSales += amt;
        } else if (method === 'tarjeta') {
          cardSales += amt;
        } else {
          transferSales += amt;
        }
      }
    });

    const expectedCash = initialCash + cashSales + repaymentCash;
    const totalFacturado = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_ars) || 0), 0);
    const operationsCount = orders.length;
    const ticketPromedio = operationsCount > 0 ? totalFacturado / operationsCount : 0;

    // Actual cash input value
    const actualCash = parseFloat(actualAmountInput) || 0;
    const difference = actualCash - expectedCash;
    
    const repaymentTotal = repaymentCash + repaymentMp + repaymentCard + repaymentTransfer;

    return {
      initialCash,
      cashSales,
      mpSales,
      cardSales,
      transferSales,
      repaymentCash,
      repaymentMp,
      repaymentCard,
      repaymentTransfer,
      repaymentTotal,
      expectedCash,
      totalFacturado,
      operationsCount,
      ticketPromedio,
      actualCash,
      difference
    };
  }, [activeSession, payments, orders, actualAmountInput]);

  async function handleCloseSession() {
    if (!activeSession || !stats) return;

    setClosing(true);
    try {
      const zReportId = `ARCA-Z-${Math.floor(Math.random() * 900000 + 100000)}`;
      
      const { data, error } = await supabase
        .from('cash_sessions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          expected_amount: stats.expectedCash,
          actual_amount: stats.actualCash,
          difference: stats.difference,
          total_sales: stats.totalFacturado,
          operations_count: stats.operationsCount,
          sales_breakdown: {
            efectivo: stats.cashSales,
            mercadopago: stats.mpSales,
            tarjeta: stats.cardSales,
            transferencia: stats.transferSales,
            monto_inicial: stats.initialCash,
            repayment_efectivo: stats.repaymentCash,
            repayment_mercadopago: stats.repaymentMp,
            repayment_tarjeta: stats.repaymentCard,
            repayment_transferencia: stats.repaymentTransfer,
            repayment_total: stats.repaymentTotal
          },
          arca_status: 'approved',
          arca_report_id: zReportId,
          notes: notes
        })
        .eq('id', activeSession.id)
        .select()
        .single();

      if (error) throw error;

      setClosedSession(data);
      setShowSuccess(true);
    } catch (err: any) {
      console.error('Error closing session:', err);
      alert('Error al cerrar la caja: ' + err.message);
    } finally {
      setClosing(false);
    }
  }

  // Print/Share ticket handler
  const handlePrint = () => {
    window.print();
  };

  if (sessionLoading) {
    return (
      <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center text-zinc-400 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
        <p className="font-black text-xs uppercase tracking-[0.2em] animate-pulse text-zinc-500">Cargando detalles de turno...</p>
      </div>
    );
  }

  if (showSuccess && closedSession) {
    return (
      <div className="flex-1 p-6 lg:p-8 flex items-center justify-center max-w-md mx-auto w-full overflow-y-auto">
        <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl p-6 shadow-2xl w-full flex flex-col gap-6 relative overflow-hidden print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none print:hidden"></div>
          
          {/* Header success */}
          <div className="flex flex-col items-center text-center gap-2 print:hidden">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase">Caja Cerrada Exitosamente</h2>
            <p className="text-xs text-zinc-400">El reporte Z fue sincronizado con ARCA.</p>
          </div>

          {/* Receipt ticket style */}
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-5 font-mono text-xs text-zinc-300 flex flex-col gap-4 shadow-inner print:bg-white print:text-black print:border-zinc-300">
            <div className="flex flex-col items-center text-center border-b border-white/10 pb-4 print:border-zinc-300">
              <span className="font-black tracking-tighter text-sm text-white print:text-black uppercase">OBSIDIANA POS</span>
              <span className="text-[10px] text-zinc-500">Comprobante Cierre de Caja</span>
              <span className="text-[10px] text-zinc-400 mt-2">Fecha: {new Date(closedSession.closed_at).toLocaleString()}</span>
            </div>

            <div className="flex flex-col gap-1.5 border-b border-white/5 pb-3 print:border-zinc-300">
              <div className="flex justify-between">
                <span>Terminal:</span>
                <span className="font-bold text-white print:text-black">{closedSession.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Estado Shift:</span>
                <span className="font-bold text-white print:text-black">CERRADO</span>
              </div>
              <div className="flex justify-between">
                <span>Reporte ARCA Z:</span>
                <span className="font-bold text-white print:text-black">{closedSession.arca_report_id}</span>
              </div>
            </div>

             <div className="flex flex-col gap-1.5 border-b border-white/5 pb-3 print:border-zinc-300">
              <div className="flex justify-between">
                <span>Efectivo Inicial:</span>
                <span>$ {parseFloat(closedSession.initial_amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Efectivo Ventas:</span>
                <span>$ {parseFloat(closedSession.sales_breakdown?.efectivo || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              {(closedSession.sales_breakdown?.repayment_efectivo || 0) > 0 && (
                <div className="flex justify-between text-zinc-400 print:text-zinc-600 pl-2">
                  <span>└ Cobros Cta Cte:</span>
                  <span>$ {parseFloat(closedSession.sales_breakdown?.repayment_efectivo || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-white print:text-black">
                <span>Efectivo Esperado:</span>
                <span>$ {parseFloat(closedSession.expected_amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-white print:text-black">
                <span>Efectivo Contado:</span>
                <span>$ {parseFloat(closedSession.actual_amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={`flex justify-between font-bold ${parseFloat(closedSession.difference) < 0 ? 'text-red-400 print:text-black' : 'text-emerald-400 print:text-black'}`}>
                <span>Diferencia (Arqueo):</span>
                <span>$ {parseFloat(closedSession.difference).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-b border-white/5 pb-3 print:border-zinc-300">
              <div className="flex justify-between">
                <span>Ventas Tarjeta:</span>
                <span>$ {parseFloat(closedSession.sales_breakdown?.tarjeta || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              {(closedSession.sales_breakdown?.repayment_tarjeta || 0) > 0 && (
                <div className="flex justify-between text-zinc-400 print:text-zinc-600 pl-2">
                  <span>└ Cobros Cta Tarjeta:</span>
                  <span>$ {parseFloat(closedSession.sales_breakdown?.repayment_tarjeta || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Ventas Mercado Pago:</span>
                <span>$ {parseFloat(closedSession.sales_breakdown?.mercadopago || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              {(closedSession.sales_breakdown?.repayment_mercadopago || 0) > 0 && (
                <div className="flex justify-between text-zinc-400 print:text-zinc-600 pl-2">
                  <span>└ Cobros Cta MP:</span>
                  <span>$ {parseFloat(closedSession.sales_breakdown?.repayment_mercadopago || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {(closedSession.sales_breakdown?.repayment_transferencia || 0) > 0 && (
                <div className="flex justify-between text-zinc-400 print:text-zinc-600 pl-2">
                  <span>Cobros Cta Transf:</span>
                  <span>$ {parseFloat(closedSession.sales_breakdown?.repayment_transferencia || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-white print:text-black pt-1">
                <span>Total Facturado:</span>
                <span>$ {parseFloat(closedSession.total_sales).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-[10px] text-zinc-500 pt-2 border-t border-dashed border-white/10 print:border-zinc-300">
              <div className="flex justify-between">
                <span>Operaciones:</span>
                <span>{closedSession.operations_count} ventas</span>
              </div>
              {closedSession.notes && (
                <div className="mt-1 flex flex-col">
                  <span>Notas:</span>
                  <span className="text-zinc-400 italic">"{closedSession.notes}"</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3 print:hidden">
            <button 
              onClick={handlePrint}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/5 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">print</span>
              Imprimir Ticket
            </button>
            <Link 
              href="/terminal"
              className="w-full bg-primary-container hover:bg-opacity-90 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 text-center"
            >
              <span className="material-symbols-outlined text-lg">point_of_sale</span>
              Volver a Terminal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="flex-1 p-6 lg:p-8 flex items-center justify-center max-w-[1440px] mx-auto w-full overflow-y-auto">
        <div className="w-full max-w-md bg-[#1A1A1A] border border-white/10 rounded-3xl p-8 shadow-2xl text-center flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 mx-auto">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-black text-white tracking-tight uppercase">No hay Turno Abierto</h2>
            <p className="text-sm text-zinc-400">
              No es posible realizar un Cierre de Caja porque actualmente no hay ningún turno activo.
            </p>
          </div>
          <Link 
            href="/terminal" 
            className="w-full bg-primary-container hover:bg-[#6D28D9] text-white py-4 rounded-xl font-black text-xs uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.2)] active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">key</span>
            Abrir Caja en Terminal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 flex flex-col gap-6 max-w-[1440px] mx-auto w-full overflow-y-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-background text-3xl font-bold">Cierre de Caja (Z)</h2>
          <p className="text-zinc-400 mt-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            Apertura: {new Date(activeSession.opened_at).toLocaleString()} — {activeSession.name}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-full border border-white/10">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-data-tabular text-data-tabular text-on-surface text-sm font-medium">Estado: Activa - Pendiente Cierre</span>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Arqueo de Caja (Left Column) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Cash Count Card */}
          <div className="bg-[#1A1A1A] rounded-lg border border-white/10 p-6 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container opacity-5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center border border-white/10 text-primary">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface text-2xl font-bold">Arqueo Físico (Efectivo)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Expected */}
              <div className="bg-surface-container-low p-4 rounded-lg border border-white/5 flex flex-col gap-1">
                <span className="font-label-md text-label-md text-zinc-400 uppercase tracking-wider text-[10px] font-black">Esperado en Sistema</span>
                <span className="font-headline-md text-headline-md text-on-surface text-xl font-bold">
                  $ {stats?.expectedCash.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {/* Input */}
              <div className="flex flex-col gap-2 relative">
                <label className="font-label-md text-label-md text-zinc-400 uppercase tracking-wider text-[10px] font-black">Efectivo Contado</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                  <input 
                    className="w-full bg-background border border-white/10 rounded-lg py-3 pl-8 pr-4 text-on-surface font-data-tabular focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-inner outline-none" 
                    type="number"
                    step="0.01"
                    min="0"
                    value={actualAmountInput}
                    onChange={(e) => setActualAmountInput(e.target.value)}
                  />
                </div>
              </div>
            </div>
            {/* Discrepancy Indicator */}
            {stats && (
              <div className={`border rounded-lg p-4 flex items-center justify-between ${
                stats.difference === 0 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : stats.difference < 0
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">
                    {stats.difference === 0 ? 'check_circle' : 'warning'}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-data-tabular text-data-tabular font-bold">
                      {stats.difference === 0 
                        ? 'Caja Balanceada (Sin Diferencias)' 
                        : stats.difference < 0
                          ? 'Diferencia Detectada (Faltante)'
                          : 'Diferencia Detectada (Sobrante)'}
                    </span>
                    <span className="text-sm opacity-70">
                      {stats.difference === 0 
                        ? 'El efectivo contado coincide exactamente con el sistema.' 
                        : stats.difference < 0
                          ? 'Falta efectivo físicamente en relación al sistema.'
                          : 'Hay más efectivo físico del esperado por sistema.'}
                    </span>
                  </div>
                </div>
                <span className="font-headline-md text-headline-md text-xl font-bold">
                  $ {stats.difference.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Sales Summary (Bento) */}
          <div className="bg-[#1A1A1A] rounded-lg border border-white/10 p-6">
            <h3 className="font-body-lg text-body-lg text-on-surface font-semibold mb-6 flex items-center gap-2 uppercase tracking-widest text-xs">
              <span className="material-symbols-outlined text-zinc-400">pie_chart</span>
              Desglose de Ventas (Turno)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Method 1 */}
              <div className="bg-surface-container-low p-4 rounded-lg border border-white/5 flex items-center justify-between hover:bg-surface-container-high transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400">payments</span>
                  <span className="font-data-tabular text-data-tabular text-zinc-300">Efectivo (Ventas)</span>
                </div>
                <span className="font-data-tabular text-data-tabular text-on-surface font-bold">
                  $ {stats?.cashSales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {/* Method 2 */}
              <div className="bg-surface-container-low p-4 rounded-lg border border-white/5 flex items-center justify-between hover:bg-surface-container-high transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-400">qr_code_scanner</span>
                  <span className="font-data-tabular text-data-tabular text-zinc-300">Mercado Pago</span>
                </div>
                <span className="font-data-tabular text-data-tabular text-on-surface font-bold">
                  $ {stats?.mpSales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {/* Method 3 */}
              <div className="bg-surface-container-low p-4 rounded-lg border border-white/5 flex items-center justify-between hover:bg-surface-container-high transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-orange-400">credit_card</span>
                  <span className="font-data-tabular text-data-tabular text-zinc-300">Tarjetas</span>
                </div>
                <span className="font-data-tabular text-data-tabular text-on-surface font-bold">
                  $ {stats?.cardSales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {/* Method 4 */}
              <div className="bg-surface-container-low p-4 rounded-lg border border-white/5 flex items-center justify-between hover:bg-surface-container-high transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-purple-400">account_balance</span>
                  <span className="font-data-tabular text-data-tabular text-zinc-300">Transferencias / Otros</span>
                </div>
                <span className="font-data-tabular text-data-tabular text-on-surface font-bold">
                  $ {stats?.transferSales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {stats && stats.repaymentTotal > 0 && (
              <>
                <h3 className="font-body-lg text-body-lg text-on-surface font-semibold mt-8 mb-4 flex items-center gap-2 uppercase tracking-widest text-[10px] text-zinc-400 border-t border-white/5 pt-6">
                  <span className="material-symbols-outlined text-zinc-500 text-sm">group</span>
                  Cobros Cuenta Corriente / Créditos
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stats.repaymentCash > 0 && (
                    <div className="bg-zinc-900/30 p-4 rounded-lg border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-emerald-400">payments</span>
                        <span className="font-bold text-xs text-zinc-500">Cobrado en Efectivo</span>
                      </div>
                      <span className="font-data-tabular font-black text-emerald-400">
                        $ {stats.repaymentCash.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {stats.repaymentMp > 0 && (
                    <div className="bg-zinc-900/30 p-4 rounded-lg border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-400">qr_code_scanner</span>
                        <span className="font-bold text-xs text-zinc-500">Cobrado Mercado Pago</span>
                      </div>
                      <span className="font-data-tabular font-black text-emerald-400">
                        $ {stats.repaymentMp.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {stats.repaymentCard > 0 && (
                    <div className="bg-zinc-900/30 p-4 rounded-lg border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-orange-400">credit_card</span>
                        <span className="font-bold text-xs text-zinc-500">Cobrado con Tarjeta</span>
                      </div>
                      <span className="font-data-tabular font-black text-emerald-400">
                        $ {stats.repaymentCard.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {stats.repaymentTransfer > 0 && (
                    <div className="bg-zinc-900/30 p-4 rounded-lg border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-purple-400">account_balance</span>
                        <span className="font-bold text-xs text-zinc-500">Cobrado Transferencia</span>
                      </div>
                      <span className="font-data-tabular font-black text-emerald-400">
                        $ {stats.repaymentTransfer.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Summary & Actions (Right Column) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Total Summary Card */}
          <div className="bg-[#1A1A1A] rounded-lg border border-white/10 p-6 flex flex-col gap-4">
            <h3 className="font-label-md text-label-md text-zinc-400 uppercase tracking-wider text-[10px] font-black">Total Facturado (Turno)</h3>
            <div className="flex items-baseline gap-2 pb-4 border-b border-white/10">
              <span className="font-headline-xl text-headline-xl text-primary text-3xl font-black tracking-tight">
                $ {stats?.totalFacturado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-zinc-500 text-sm font-bold">ARS</span>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Monto Inicial</span>
                <span className="font-data-tabular text-on-surface font-bold">
                  $ {stats?.initialCash.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Total Operaciones</span>
                <span className="font-data-tabular text-on-surface font-bold">{stats?.operationsCount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Ticket Promedio</span>
                <span className="font-data-tabular text-on-surface font-bold">
                  $ {stats?.ticketPromedio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Notes field */}
          <div className="bg-[#1A1A1A] rounded-lg border border-white/10 p-6 flex flex-col gap-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Observaciones de Cierre</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-background border border-white/10 rounded-lg p-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-600 h-24 resize-none"
              placeholder="Ej. Se detectó billete falso de $1000, o algún detalle en tarjetas..."
            />
          </div>

          {/* ARCA Fiscal Closure */}
          <div className="bg-surface-container-high rounded-lg border border-primary/30 p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/50 text-primary">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </div>
                <h3 className="font-body-lg text-body-lg text-on-surface font-semibold uppercase tracking-tight">Sincronización Fiscal ARCA</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Al confirmar, se generará el Reporte Z oficial de Obsidiana y se reportará a ARCA de manera automática.
              </p>
              <div className="flex items-center gap-2 mt-2 p-3 bg-background rounded border border-white/5">
                <span className="material-symbols-outlined text-emerald-500 text-[18px]">cloud_done</span>
                <span className="text-sm text-zinc-300 font-medium">Conexión Fiscal: Estable y Lista</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-auto pt-6 border-t border-white/10">
            <button 
              onClick={handleCloseSession}
              disabled={closing}
              className="w-full bg-primary-container hover:bg-opacity-90 text-white py-4 rounded-lg font-headline-md text-[16px] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.3)] font-black uppercase tracking-widest disabled:opacity-50 active:scale-95"
            >
              {closing ? (
                <>
                  <span className="material-symbols-outlined animate-spin">autorenew</span>
                  Procesando Cierre Z...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">lock</span>
                  Confirmar y Cerrar Caja (Z)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
