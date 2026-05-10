import React from 'react';

export default function SuppliersPage() {
  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
        <div>
          <h1 className="font-headline-xl text-3xl font-black text-white mb-2">Proveedores</h1>
          <p className="text-zinc-400 font-body-sm text-sm">Gestiona tu red de suministro, deudas activas y órdenes de compra.</p>
        </div>
        <button className="flex items-center justify-center gap-3 px-6 py-3 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-95 group">
          <span className="material-symbols-outlined text-[18px] group-hover:rotate-90 transition-transform">add</span>
          Nuevo Proveedor
        </button>
      </div>

      {/* Summary Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Proveedores', value: '142', trend: '+12 este mes', color: 'primary', icon: 'group' },
          { label: 'Deuda Activa', value: '$ 45,230', trend: 'Vence en 30 días', color: 'red', icon: 'account_balance_wallet' },
          { label: 'Órdenes Pendientes', value: '28', trend: 'Requieren aprobación', color: 'blue', icon: 'pending_actions' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#1A1A1A] rounded-3xl p-8 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-all">
            <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${stat.color}-500/5 rounded-full blur-2xl group-hover:bg-${stat.color}-500/10 transition-all duration-700`}></div>
            <div className="flex justify-between items-start relative z-10">
              <span className="font-black text-[10px] text-zinc-600 uppercase tracking-[0.2em]">{stat.label}</span>
              <div className={`w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-${stat.color === 'primary' ? 'primary-container' : stat.color + '-400'}`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
            </div>
            <div className="mt-6 relative z-10">
              <span className="font-data-tabular text-4xl font-black text-white block">{stat.value}</span>
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-2 block">{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative group flex-1 w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors">search</span>
          <input 
            className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm text-white font-medium focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-700" 
            placeholder="Buscar por nombre, CUIT o email..." 
            type="text" 
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <select className="flex-1 md:w-48 bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-xs text-zinc-400 font-black uppercase tracking-widest focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer">
            <option>Categoría</option>
            <option>Electrónica</option>
            <option>Insumos</option>
          </select>
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest shrink-0">
            <span className="material-symbols-outlined text-lg">filter_list</span>
            Filtros
          </button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-900/50 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 border-b border-white/5">
                <th className="py-5 px-8">Proveedor / CUIT</th>
                <th className="py-5 px-8">Categoría</th>
                <th className="py-5 px-8">Contacto</th>
                <th className="py-5 px-8 text-right">Saldo Pendiente</th>
                <th className="py-5 px-8 text-center">Estado</th>
                <th className="py-5 px-8 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm font-data-tabular text-white">
              {[
                { name: 'TechSupply Corp', cuit: '30-71234567-8', cat: 'Electrónica', email: 'ventas@techsupply.com', balance: '$ 12,450', status: 'Activo', color: 'emerald' },
                { name: 'Office Max Sur', cuit: '30-98765432-1', cat: 'Insumos Oficina', email: 'contacto@officemax.com', balance: '$ 890.50', status: 'Revisión', color: 'amber' },
                { name: 'Logística Global SA', cuit: '30-33445566-7', cat: 'Servicios', email: 'ops@logisticaglobal.com', balance: '$ 5,200', status: 'Suspendido', color: 'red' },
                { name: 'Mobiliario Neo', cuit: '30-11223344-5', cat: 'Mobiliario', email: 'ventas@neomuebles.ar', balance: '$ 0', status: 'Activo', color: 'emerald' },
              ].map((supplier, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-5 px-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center font-black text-xs text-primary-container">
                        {supplier.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{supplier.name}</p>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-0.5">CUIT: {supplier.cuit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-8 text-zinc-400 font-bold text-xs">{supplier.cat}</td>
                  <td className="py-5 px-8">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">{supplier.email}</span>
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Canal Directo</span>
                    </div>
                  </td>
                  <td className="py-5 px-8 text-right font-black text-white">{supplier.balance}</td>
                  <td className="py-5 px-8 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-${supplier.color}-500/10 text-${supplier.color}-400 border-${supplier.color}-500/20`}>
                      {supplier.status}
                    </span>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-500 hover:text-primary hover:bg-zinc-700 flex items-center justify-center transition-all">
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </button>
                      <button className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-700 flex items-center justify-center transition-all">
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-8 border-t border-white/5 bg-[#1E1E1E]/30 flex justify-between items-center">
          <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Mostrando registros del 1 al 4 de 142 proveedores</span>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 flex items-center justify-center border border-white/5 rounded-xl text-zinc-700 hover:text-white hover:bg-white/5 transition-all">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center bg-primary-container text-white font-black text-xs rounded-xl shadow-lg">1</button>
            <button className="w-10 h-10 flex items-center justify-center hover:bg-white/5 text-zinc-600 font-black text-xs rounded-xl">2</button>
            <button className="w-10 h-10 flex items-center justify-center hover:bg-white/5 text-zinc-600 font-black text-xs rounded-xl">3</button>
            <button className="w-10 h-10 flex items-center justify-center border border-white/5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
