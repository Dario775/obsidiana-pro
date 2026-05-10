import React from 'react';

export default function ClosurePage() {
  return (
    <div className="flex-1 p-6 lg:p-8 flex flex-col gap-6 max-w-[1440px] mx-auto w-full overflow-y-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-on-background text-3xl font-bold">Cierre de Caja (Z)</h2>
          <p className="text-zinc-400 mt-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            Apertura: Hoy, 08:30 AM — Caja #04
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
                <span className="font-headline-md text-headline-md text-on-surface text-xl font-bold">$ 145,230.00</span>
              </div>
              {/* Input */}
              <div className="flex flex-col gap-2 relative">
                <label className="font-label-md text-label-md text-zinc-400 uppercase tracking-wider text-[10px] font-black">Efectivo Contado</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                  <input 
                    className="w-full bg-background border border-white/10 rounded-lg py-3 pl-8 pr-4 text-on-surface font-data-tabular focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-inner outline-none" 
                    type="text" 
                    defaultValue="145,000.00"
                  />
                </div>
              </div>
            </div>
            {/* Discrepancy Indicator */}
            <div className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-error">warning</span>
                <div className="flex flex-col">
                  <span className="font-data-tabular text-data-tabular text-error font-bold">Diferencia Detectada (Faltante)</span>
                  <span className="text-sm text-error/70">Revisar billetes de $1000 y $500.</span>
                </div>
              </div>
              <span className="font-headline-md text-headline-md text-error text-xl font-bold">-$ 230.00</span>
            </div>
          </div>

          {/* Sales Summary (Bento) */}
          <div className="bg-[#1A1A1A] rounded-lg border border-white/10 p-6">
            <h3 className="font-body-lg text-body-lg text-on-surface font-semibold mb-6 flex items-center gap-2 uppercase tracking-widest text-xs">
              <span className="material-symbols-outlined text-zinc-400">pie_chart</span>
              Desglose de Ventas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Method 1 */}
              <div className="bg-surface-container-low p-4 rounded-lg border border-white/5 flex items-center justify-between hover:bg-surface-container-high transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400">payments</span>
                  <span className="font-data-tabular text-data-tabular text-zinc-300">Efectivo</span>
                </div>
                <span className="font-data-tabular text-data-tabular text-on-surface font-bold">$ 145,230.00</span>
              </div>
              {/* Method 2 */}
              <div className="bg-surface-container-low p-4 rounded-lg border border-white/5 flex items-center justify-between hover:bg-surface-container-high transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-400">qr_code_scanner</span>
                  <span className="font-data-tabular text-data-tabular text-zinc-300">Mercado Pago</span>
                </div>
                <span className="font-data-tabular text-data-tabular text-on-surface font-bold">$ 320,500.00</span>
              </div>
              {/* Method 3 */}
              <div className="bg-surface-container-low p-4 rounded-lg border border-white/5 flex items-center justify-between hover:bg-surface-container-high transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-orange-400">credit_card</span>
                  <span className="font-data-tabular text-data-tabular text-zinc-300">Tarjetas (TDC/TDD)</span>
                </div>
                <span className="font-data-tabular text-data-tabular text-on-surface font-bold">$ 85,400.00</span>
              </div>
              {/* Method 4 */}
              <div className="bg-surface-container-low p-4 rounded-lg border border-white/5 flex items-center justify-between hover:bg-surface-container-high transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-purple-400">account_balance</span>
                  <span className="font-data-tabular text-data-tabular text-zinc-300">Transferencias</span>
                </div>
                <span className="font-data-tabular text-data-tabular text-on-surface font-bold">$ 12,000.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary & Actions (Right Column) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Total Summary Card */}
          <div className="bg-[#1A1A1A] rounded-lg border border-white/10 p-6 flex flex-col gap-4">
            <h3 className="font-label-md text-label-md text-zinc-400 uppercase tracking-wider text-[10px] font-black">Total Facturado (Turno)</h3>
            <div className="flex items-baseline gap-2 pb-4 border-b border-white/10">
              <span className="font-headline-xl text-headline-xl text-primary text-3xl font-black tracking-tight">$ 563,130.00</span>
              <span className="text-zinc-500 text-sm font-bold">ARS</span>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Total Operaciones</span>
                <span className="font-data-tabular text-on-surface font-bold">142</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Ticket Promedio</span>
                <span className="font-data-tabular text-on-surface font-bold">$ 3,965.70</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Devoluciones</span>
                <span className="font-data-tabular text-error font-bold">-$ 4,500.00 (2)</span>
              </div>
            </div>
          </div>

          {/* ARCA Fiscal Closure */}
          <div className="bg-surface-container-high rounded-lg border border-primary/30 p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/50 text-primary">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </div>
                <h3 className="font-body-lg text-body-lg text-on-surface font-semibold uppercase tracking-tight">Cierre Fiscal ARCA</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">Al confirmar, se emitirá el Reporte Z definitivo y se comunicará con los servidores de ARCA.</p>
              <div className="flex items-center gap-2 mt-2 p-3 bg-background rounded border border-white/5">
                <span className="material-symbols-outlined text-emerald-500 text-[18px]">cloud_done</span>
                <span className="text-sm text-zinc-300 font-medium">Conexión Fiscal: Estable</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-auto pt-6 border-t border-white/10">
            <button className="w-full bg-surface-container border border-white/10 hover:bg-surface-container-highest text-secondary py-4 rounded-lg font-data-tabular text-sm font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
              <span className="material-symbols-outlined">print</span>
              Imprimir Reporte X (Provisorio)
            </button>
            <button className="w-full bg-primary-container hover:bg-opacity-90 text-white py-4 rounded-lg font-headline-md text-[16px] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.3)] font-black uppercase tracking-widest">
              <span className="material-symbols-outlined">lock</span>
              Confirmar y Cerrar Caja (Z)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
