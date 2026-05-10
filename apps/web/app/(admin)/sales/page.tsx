import React from 'react';

export default function SalesPage() {
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
          <h2 className="font-headline-xl text-headline-xl text-on-background tracking-tight">Historial de Cierres de Caja</h2>
          <p className="font-body-sm text-body-sm text-outline mt-1">Registro auditable de sesiones de terminal y sincronización ARCA.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant/30 rounded-lg text-on-surface-variant hover:text-on-background hover:bg-surface-container-highest transition-colors font-label-md text-label-md uppercase">
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            Últimos 7 Días
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant/30 rounded-lg text-on-surface-variant hover:text-on-background hover:bg-surface-container-highest transition-colors font-label-md text-label-md uppercase">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filtros
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex items-start justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary-container"></div>
          <div>
            <p className="font-label-md text-label-md text-outline uppercase">Facturación Total (7D)</p>
            <h3 className="font-headline-xl text-headline-xl text-on-background mt-1">$4,250,900.00</h3>
            <div className="flex items-center gap-1 mt-2 text-emerald-400">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span className="font-label-md text-[11px]">+12.5% vs sem. ant.</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary-container">payments</span>
          </div>
        </div>
        <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex items-start justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-error"></div>
          <div>
            <p className="font-label-md text-label-md text-outline uppercase">Descuadres Detectados</p>
            <h3 className="font-headline-xl text-headline-xl text-on-background mt-1">3</h3>
            <div className="flex items-center gap-1 mt-2 text-error">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              <span className="font-label-md text-[11px]">Revisión requerida</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error">
            <span className="material-symbols-outlined">balance</span>
          </div>
        </div>
        <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex items-start justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-secondary"></div>
          <div>
            <p className="font-label-md text-label-md text-outline uppercase">Estado ARCA</p>
            <h3 className="font-headline-xl text-[24px] font-bold text-on-background mt-1 leading-tight">100% Sincronizado</h3>
            <div className="flex items-center gap-1 mt-2 text-outline">
              <span className="material-symbols-outlined text-[14px]">cloud_done</span>
              <span className="font-label-md text-[11px]">Última vez: hace 5 min</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-high">
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input 
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg pl-9 pr-4 py-2 text-sm text-on-background focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all placeholder:text-outline outline-none" 
              placeholder="Buscar por ID, Cajero o Terminal..." 
              type="text" 
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 border border-outline-variant/30 rounded-lg text-on-surface-variant hover:text-on-background hover:bg-white/10 transition-colors font-label-md text-[12px] uppercase">
            <span className="material-symbols-outlined text-[16px]">download</span>
            Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-surface-container-high border-b border-outline-variant/10 text-outline font-label-md text-[11px] uppercase tracking-wider">
                <th className="px-6 py-3 font-semibold">Fecha / Hora</th>
                <th className="px-6 py-3 font-semibold">Terminal</th>
                <th className="px-6 py-3 font-semibold">Cajero</th>
                <th className="px-6 py-3 font-semibold text-right">Total Facturado</th>
                <th className="px-6 py-3 font-semibold text-right">Diferencia</th>
                <th className="px-6 py-3 font-semibold text-center">Estado ARCA</th>
                <th className="px-6 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm font-data-tabular">
              {[
                { date: '12 Oct 2023', time: '23:45:12', terminal: 'TRM-01', user: 'Martin R.', initials: 'MR', total: '$ 854,320.00', diff: '$ 0.00', diffColor: 'emerald-400', arca: 'Aprobado', arcaColor: 'emerald-400' },
                { date: '12 Oct 2023', time: '23:30:05', terminal: 'TRM-03', user: 'Sofia G.', initials: 'SG', total: '$ 612,150.00', diff: '-$ 1,200.00', diffColor: 'error', arca: 'Pendiente ARCA', arcaColor: 'amber-400' },
                { date: '11 Oct 2023', time: '23:55:00', terminal: 'TRM-01', user: 'Martin R.', initials: 'MR', total: '$ 910,050.00', diff: '$ 0.00', diffColor: 'emerald-400', arca: 'Aprobado', arcaColor: 'emerald-400' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-on-background font-medium">{row.date}</span>
                      <span className="text-outline text-xs">{row.time}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-outline">point_of_sale</span>
                      <span className="text-on-surface-variant">{row.terminal}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-container/20 text-primary flex items-center justify-center text-[10px] font-bold">{row.initials}</div>
                      <span className="text-on-surface-variant">{row.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-on-background font-medium">{row.total}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center gap-1 text-${row.diffColor} bg-${row.diffColor}/10 px-2 py-0.5 rounded text-xs font-medium`}>
                      {row.diff}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-${row.arcaColor}/20 bg-${row.arcaColor}/10 text-${row.arcaColor} text-[11px] font-medium tracking-wide uppercase`}>
                      <div className={`w-1.5 h-1.5 rounded-full bg-${row.arcaColor}`}></div>
                      {row.arca}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-outline hover:text-on-background hover:bg-white/10 rounded transition-colors">
                        <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                      </button>
                      <button className="px-3 py-1.5 text-[12px] font-semibold text-primary hover:text-on-background hover:bg-primary-container/20 border border-primary/20 rounded transition-colors uppercase">
                        Ver Detalle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant/10 bg-surface-container-high flex items-center justify-between text-xs text-outline">
          <span>Mostrando 1 a 3 de 45 registros</span>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded hover:bg-white/10 hover:text-on-background disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="w-6 h-6 rounded bg-primary-container/20 text-primary font-medium flex items-center justify-center">1</button>
            <button className="w-6 h-6 rounded hover:bg-white/10 hover:text-on-background flex items-center justify-center">2</button>
            <button className="w-6 h-6 rounded hover:bg-white/10 hover:text-on-background flex items-center justify-center">3</button>
            <span className="px-1">...</span>
            <button className="p-1 rounded hover:bg-white/10 hover:text-on-background">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
