import React from 'react';

export default function ZClosurePage() {
  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="font-headline-xl text-3xl font-black text-white mb-1">Cierre de Caja (Z)</h1>
          <p className="text-zinc-400 font-body-sm text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            Apertura: Hoy, 08:30 AM — Caja #04
          </p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 rounded-full border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-black text-[10px] uppercase tracking-widest text-zinc-400">Estado: Activa - Pendiente Cierre</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Arqueo & Desglose */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          {/* Arqueo Físico */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 p-8 flex flex-col gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-white/10 text-primary-container">
                <span className="material-symbols-outlined text-2xl">payments</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Arqueo Físico (Efectivo)</h3>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-0.5">Control de numerario en caja</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 flex flex-col gap-2">
                <span className="font-black text-[10px] text-zinc-500 uppercase tracking-widest">Esperado en Sistema</span>
                <span className="font-data-tabular text-3xl font-black text-white">$ 145,230.00</span>
              </div>
              <div className="flex flex-col gap-3">
                <label className="font-black text-[10px] text-zinc-500 uppercase tracking-widest">Efectivo Contado</label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 font-bold group-focus-within:text-primary transition-colors">$</span>
                  <input 
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-4 pl-10 pr-6 text-xl font-black text-white focus:ring-1 focus:ring-primary outline-none transition-all shadow-2xl" 
                    type="text" 
                    defaultValue="145,000.00"
                  />
                </div>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                  <span className="material-symbols-outlined">warning</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-[10px] text-red-400 uppercase tracking-widest">Diferencia Detectada (Faltante)</span>
                  <span className="text-xs text-red-500/60 font-bold">Sugerencia: Revisar arqueo manual de billetes.</span>
                </div>
              </div>
              <span className="font-data-tabular text-2xl font-black text-red-500">-$ 230.00</span>
            </div>
          </div>

          {/* Desglose de Ventas */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 p-8">
            <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3">
              <span className="material-symbols-outlined text-zinc-600">pie_chart</span>
              Desglose por Métodos de Pago
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Efectivo', value: 145230.00, color: 'emerald', icon: 'payments' },
                { label: 'Mercado Pago', value: 320500.00, color: 'blue', icon: 'qr_code_scanner' },
                { label: 'Tarjetas (TDC/TDD)', value: 85400.00, color: 'orange', icon: 'credit_card' },
                { label: 'Transferencias', value: 12000.00, color: 'purple', icon: 'account_balance' },
              ].map((method, i) => (
                <div key={i} className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all cursor-default">
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-${method.color}-400 group-hover:scale-110 transition-transform`}>{method.icon}</span>
                    <span className="font-bold text-xs text-zinc-400">{method.label}</span>
                  </div>
                  <span className="font-data-tabular font-black text-white">$ {method.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Resumen & Fiscal */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          {/* Totales Turno */}
          <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 p-8 flex flex-col gap-6">
            <p className="font-black text-[10px] text-zinc-500 uppercase tracking-widest">Total Facturado (Turno)</p>
            <div className="flex items-baseline gap-3 pb-8 border-b border-white/5">
              <span className="font-data-tabular text-5xl font-black text-primary-container tracking-tighter">$ 563,130.00</span>
              <span className="text-zinc-600 font-black text-xs uppercase">ARS</span>
            </div>
            
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Operaciones</span>
                <span className="font-data-tabular font-black text-white">142</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Ticket Promedio</span>
                <span className="font-data-tabular font-black text-white">$ 3,965.70</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Devoluciones</span>
                <span className="font-data-tabular font-black text-red-500">-$ 4,500.00 (2)</span>
              </div>
            </div>
          </div>

          {/* ARCA Fiscal Status */}
          <div className="bg-zinc-900 rounded-2xl border border-primary/20 p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 group-hover:opacity-100 transition-all"></div>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 text-primary">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">Cierre Fiscal ARCA</h3>
              </div>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed">Al confirmar el cierre, se emitirá automáticamente el Reporte Z definitivo y se sincronizará con los servicios fiscales de ARCA.</p>
              <div className="flex items-center gap-3 mt-2 p-4 bg-zinc-950/50 rounded-xl border border-white/5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Conexión Fiscal: Estable</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 mt-auto">
            <button className="w-full bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3">
              <span className="material-symbols-outlined text-xl">print</span>
              Imprimir Reporte X (Provisorio)
            </button>
            <button className="w-full bg-primary-container hover:bg-[#6D28D9] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(124,58,237,0.3)] active:scale-95 group">
              <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">lock</span>
              Confirmar y Cerrar Caja (Z)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
