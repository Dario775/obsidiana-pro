import React from 'react';

export default function CashHistoryPage() {
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
          <p className="text-zinc-400 font-body-sm text-sm max-w-2xl">Registro auditable de sesiones de terminal, arqueos de caja y sincronización ARCA (ex-AFIP).</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-label-md text-xs uppercase font-bold tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            Últimos 7 Días
          </button>
          <button className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-label-md text-xs uppercase font-bold tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filtros
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
            <h3 className="font-data-tabular text-3xl font-black text-white tracking-tight">$ 4,250,900.00</h3>
            <div className="flex items-center gap-1.5 mt-2 text-emerald-400">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span className="font-black text-[10px] uppercase tracking-tighter">+12.5% vs sem. ant.</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-red-500/20 transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
          <div className="flex justify-between items-start mb-4">
            <p className="font-black text-[10px] text-zinc-500 uppercase tracking-widest">Descuadres Detectados</p>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <span className="material-symbols-outlined text-[20px]">balance</span>
            </div>
          </div>
          <div>
            <h3 className="font-data-tabular text-3xl font-black text-white tracking-tight">3</h3>
            <div className="flex items-center gap-1.5 mt-2 text-red-500">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              <span className="font-black text-[10px] uppercase tracking-tighter text-red-400">Revisión requerida</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-blue-400/20 transition-all">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <div className="flex justify-between items-start mb-4">
            <p className="font-black text-[10px] text-zinc-500 uppercase tracking-widest">Estado ARCA</p>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-[20px]">cloud_done</span>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight leading-tight">100% Sincronizado</h3>
            <div className="flex items-center gap-1.5 mt-2 text-zinc-500">
              <span className="font-black text-[10px] uppercase tracking-tighter">Último reporte: hace 5 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 bg-[#1E1E1E]/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-80 group">
             <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors text-lg">search</span>
             <input className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white font-medium focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-600" placeholder="Buscar por ID, Cajero o Terminal..." type="text" />
          </div>
          <button className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
             <span className="material-symbols-outlined text-[18px]">download</span> Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1E1E1E]/30 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                <th className="py-4 px-8">Fecha / Hora</th>
                <th className="py-4 px-8">Terminal</th>
                <th className="py-4 px-8">Cajero</th>
                <th className="py-4 px-8 text-right">Total Facturado</th>
                <th className="py-4 px-8 text-right">Diferencia</th>
                <th className="py-4 px-8 text-center">Estado ARCA</th>
                <th className="py-4 px-8 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm font-data-tabular text-white">
              {[
                { date: '12 Oct 2023', time: '23:45:12', terminal: 'TRM-01', user: 'Martin R.', total: 854320.00, diff: 0, status: 'Aprobado', color: 'emerald' },
                { date: '12 Oct 2023', time: '23:30:05', terminal: 'TRM-03', user: 'Sofia G.', total: 612150.00, diff: -1200, status: 'Pendiente ARCA', color: 'amber' },
                { date: '11 Oct 2023', time: '23:55:00', terminal: 'TRM-01', user: 'Martin R.', total: 910050.00, diff: 0, status: 'Aprobado', color: 'emerald' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-5 px-8">
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{row.date}</span>
                      <span className="text-zinc-600 text-[11px] font-black tracking-widest">{row.time}</span>
                    </div>
                  </td>
                  <td className="py-5 px-8">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <span className="material-symbols-outlined text-[18px] text-zinc-600">point_of_sale</span>
                      <span className="font-black text-xs">{row.terminal}</span>
                    </div>
                  </td>
                  <td className="py-5 px-8">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 text-primary-container flex items-center justify-center text-[10px] font-black border border-white/5">
                        {row.user.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium text-zinc-300">{row.user}</span>
                    </div>
                  </td>
                  <td className="py-5 px-8 text-right font-black text-white">$ {row.total.toLocaleString()}</td>
                  <td className="py-5 px-8 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black ${row.diff === 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10 border border-red-400/20'}`}>
                      {row.diff === 0 ? '$ 0.00' : `-$ ${Math.abs(row.diff).toLocaleString()}`}
                    </span>
                  </td>
                  <td className="py-5 px-8 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-${row.color}-500/10 text-${row.color}-400 border-${row.color}-500/20`}>
                      <span className={`w-1.5 h-1.5 rounded-full bg-${row.color}-400 ${row.color === 'amber' ? 'animate-pulse' : ''}`}></span>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="p-2 text-zinc-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                      </button>
                      <button className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-black uppercase tracking-widest rounded-lg">
                        Detalle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 border-t border-white/5 bg-[#1E1E1E]/50 flex justify-between items-center">
           <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Mostrando 1-3 de 45 cierres</span>
           <div className="flex items-center gap-2">
              <button className="p-2 border border-white/10 rounded-lg text-zinc-500 hover:text-white transition-all opacity-30" disabled><span className="material-symbols-outlined">chevron_left</span></button>
              <button className="w-8 h-8 flex items-center justify-center bg-zinc-800 text-white font-black text-xs rounded-lg">1</button>
              <button className="w-8 h-8 flex items-center justify-center hover:bg-white/5 text-zinc-500 hover:text-white font-black text-xs rounded-lg">2</button>
              <button className="p-2 border border-white/10 rounded-lg text-zinc-500 hover:text-white transition-all"><span className="material-symbols-outlined">chevron_right</span></button>
           </div>
        </div>
      </div>
    </div>
  );
}
