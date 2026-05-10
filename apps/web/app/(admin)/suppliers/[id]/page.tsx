import React from 'react';

export default function SupplierDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Supplier Profile Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -ml-32 -mt-32 pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
        
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-primary-container shadow-2xl">
              <span className="material-symbols-outlined text-4xl">factory</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-headline-xl text-3xl font-black text-white tracking-tight">TechSupply Corp</h1>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  Proveedor Activo
                </span>
              </div>
              <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">badge</span>
                CUIT: 30-71234567-8
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button className="px-6 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95">
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Editar Proveedor
          </button>
          <button className="px-6 py-3 rounded-xl bg-primary-container text-white hover:bg-[#6D28D9] transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(124,58,237,0.3)] flex items-center gap-2 active:scale-95 group">
            <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">add_shopping_cart</span>
            Nueva Orden
          </button>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Comprado', value: '$ 124,500', trend: '+12%', color: 'emerald', icon: 'payments', sub: 'Año 2024' },
          { label: 'Deuda Activa', value: '$ 12,300', trend: 'Crítico', color: 'red', icon: 'account_balance_wallet', sub: 'Vto. en 15 días' },
          { label: 'Lead Time Promedio', value: '3.2 Días', trend: '-0.5d', color: 'blue', icon: 'schedule', sub: 'Últimas 50 órdenes' },
        ].map((metric, i) => (
          <div key={i} className="bg-[#1A1A1A] rounded-3xl p-8 border border-white/5 flex flex-col gap-2 relative overflow-hidden group hover:border-white/10 transition-all">
            <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${metric.color}-500/5 rounded-full blur-2xl group-hover:bg-${metric.color}-500/10 transition-all duration-700`}></div>
            <p className="font-black text-[10px] text-zinc-600 uppercase tracking-[0.2em]">{metric.label}</p>
            <div className="flex items-baseline gap-3 mt-2 relative z-10">
              <h3 className={`font-data-tabular text-3xl font-black ${metric.color === 'red' ? 'text-red-500' : 'text-white'}`}>{metric.value}</h3>
              <span className={`font-black text-[10px] ${metric.trend.includes('+') || metric.trend.includes('-') ? 'text-emerald-400' : 'text-red-400'} flex items-center gap-1`}>
                <span className="material-symbols-outlined text-[14px]">{metric.trend.includes('+') ? 'trending_up' : 'trending_down'}</span>
                {metric.trend}
              </span>
            </div>
            <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mt-2">{metric.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Content Area: Tabs & Tables */}
      <div className="flex flex-col gap-6">
        {/* Tab Navigation */}
        <div className="flex items-center gap-10 border-b border-white/5 px-4">
          {['Órdenes de Compra', 'Catálogo de Productos', 'Información de Contacto'].map((tab, i) => (
            <button key={i} className={`py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all relative ${i === 0 ? 'text-primary' : 'text-zinc-600 hover:text-zinc-400'}`}>
              {tab}
              {i === 0 && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]"></div>}
            </button>
          ))}
        </div>

        {/* Recent Orders Table */}
        <div className="bg-[#1A1A1A] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-[#1E1E1E]/50">
            <h3 className="font-black text-sm text-white uppercase tracking-widest flex items-center gap-3">
              <span className="material-symbols-outlined text-zinc-600">history</span>
              Últimas Transacciones
            </h3>
            <div className="relative group w-full md:w-80">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors">search</span>
              <input 
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 pl-12 pr-6 text-xs text-white font-medium focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-700" 
                placeholder="Buscar por ID de orden..." 
                type="text" 
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-900/30 text-[9px] font-black uppercase tracking-widest text-zinc-600 border-b border-white/5">
                  <th className="py-4 px-8">ID Orden</th>
                  <th className="py-4 px-8">Fecha</th>
                  <th className="py-4 px-8">Ítems</th>
                  <th className="py-4 px-8 text-right">Monto Total</th>
                  <th className="py-4 px-8 text-center">Estado</th>
                  <th className="py-4 px-8 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-data-tabular text-white">
                {[
                  { id: '#ORD-2024-891', date: 'Oct 24, 2024', items: '12 SKUs', total: '$ 4,500.00', status: 'Recibido', color: 'emerald' },
                  { id: '#ORD-2024-885', date: 'Oct 20, 2024', items: '3 SKUs', total: '$ 1,250.50', status: 'Pendiente', color: 'amber' },
                  { id: '#ORD-2024-872', date: 'Oct 15, 2024', items: '45 SKUs', total: '$ 12,800.00', status: 'Recibido', color: 'emerald' },
                  { id: '#ORD-2024-850', date: 'Oct 02, 2024', items: '1 SKU', total: '$ 450.00', status: 'Cancelado', color: 'red' },
                ].map((order, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-5 px-8 font-black text-primary-container text-xs">{order.id}</td>
                    <td className="py-5 px-8 text-zinc-400 font-bold text-xs">{order.date}</td>
                    <td className="py-5 px-8 text-zinc-500 font-medium text-xs">{order.items}</td>
                    <td className="py-5 px-8 text-right font-black text-white">{order.total}</td>
                    <td className="py-5 px-8 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-${order.color}-500/10 text-${order.color}-400 border-${order.color}-500/20`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <button className="p-2 text-zinc-700 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 border-t border-white/5 bg-[#1E1E1E]/30 flex justify-between items-center">
            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Página 1 de 6 — Mostrando registros recientes</span>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-white/5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/5 transition-all font-black text-[10px] uppercase tracking-widest">Anterior</button>
              <button className="px-4 py-2 border border-white/5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/5 transition-all font-black text-[10px] uppercase tracking-widest">Siguiente</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
