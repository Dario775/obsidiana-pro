import React from 'react';

export default function StockAlertsPage() {
  return (
    <div className="max-w-[1000px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-8">
        <div>
          <h1 className="font-headline-xl text-3xl font-black text-white mb-2">Alertas de Stock</h1>
          <p className="text-zinc-400 font-body-sm text-sm">Gestiona las notificaciones y umbrales críticos para el control de inventario.</p>
        </div>
        <div className="flex items-center gap-4 bg-zinc-900 px-5 py-3 rounded-2xl border border-white/5">
          <div className="relative inline-flex items-center cursor-pointer group">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
          </div>
          <span className="font-black text-[10px] text-white uppercase tracking-widest">Alertas Globales</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Core Configuration */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Global Threshold Card */}
          <div className="bg-[#1A1A1A] rounded-3xl border border-white/10 p-8 flex flex-col gap-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-primary/10 transition-all duration-700"></div>
            
            <div className="flex items-start gap-5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center border border-white/10 text-primary-container">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Umbral Global</h3>
                <p className="text-xs text-zinc-500 font-medium leading-relaxed mt-1">Define el límite mínimo de unidades antes de disparar una alerta general en el sistema.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 bg-zinc-950/50 p-6 rounded-2xl border border-white/5 relative z-10">
              <label className="font-black text-[10px] text-zinc-400 uppercase tracking-widest flex-1">Notificar cuando el stock sea menor a:</label>
              <div className="relative w-full sm:w-32 group">
                <input 
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-white font-black text-center focus:ring-1 focus:ring-primary outline-none transition-all text-lg shadow-2xl" 
                  type="number" 
                  defaultValue="5"
                />
                <span className="absolute -bottom-6 left-0 w-full text-center text-[9px] font-black text-zinc-600 uppercase tracking-widest">Unidades</span>
              </div>
            </div>
          </div>

          {/* Category Specific Overrides */}
          <div className="bg-[#1A1A1A] rounded-3xl border border-white/10 p-8 flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Excepciones por Categoría</h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">Configuración específica que sobrescribe el umbral global.</p>
              </div>
              <button className="w-10 h-10 rounded-xl bg-zinc-900 text-zinc-400 hover:text-primary hover:bg-zinc-800 transition-all flex items-center justify-center border border-white/5 active:scale-95">
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>

            <div className="border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-900/50 text-[9px] font-black uppercase tracking-widest text-zinc-600 border-b border-white/5">
                    <th className="py-4 px-6">Categoría</th>
                    <th className="py-4 px-6 text-center w-32">Límite</th>
                    <th className="py-4 px-6 text-right w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm font-data-tabular text-white">
                  {[
                    { name: 'Electrónica', limit: 2, icon: 'devices' },
                    { name: 'Ropa & Accesorios', limit: 10, icon: 'checkroom' },
                  ].map((cat, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6 flex items-center gap-4">
                        <span className="material-symbols-outlined text-zinc-600 text-lg">{cat.icon}</span>
                        <span className="font-bold text-xs">{cat.name}</span>
                      </td>
                      <td className="py-4 px-6">
                        <input className="w-full bg-zinc-950/50 border border-transparent group-hover:border-white/10 rounded-lg py-1.5 px-3 text-center text-white font-black text-xs focus:outline-none focus:border-primary transition-all" type="number" defaultValue={cat.limit} />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button className="text-zinc-700 hover:text-red-500 transition-colors">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Channels & Actions */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {/* Notification Channels */}
          <div className="bg-[#1A1A1A] rounded-3xl border border-white/10 p-8 flex flex-col gap-8">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
              <span className="material-symbols-outlined text-primary-container">notifications_active</span>
              Canales
            </h3>
            <div className="space-y-6">
              {[
                { label: 'Alertas en Sistema', desc: 'Notificaciones internas de escritorio.', checked: true },
                { label: 'Correo Electrónico', desc: 'Resúmenes a admin@obsidiana.com', checked: true },
                { label: 'Push Móvil', desc: 'A través de la App de Obsidiana.', checked: false },
              ].map((channel, i) => (
                <label key={i} className="flex items-start gap-4 cursor-pointer group">
                  <div className="relative flex items-center mt-1">
                    <input type="checkbox" defaultChecked={channel.checked} className="peer appearance-none w-5 h-5 border border-white/10 rounded-md bg-zinc-950 checked:bg-primary checked:border-primary transition-all cursor-pointer shadow-xl" />
                    <span className="material-symbols-outlined absolute inset-0 text-white text-xs flex items-center justify-center opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                  </div>
                  <div>
                    <span className="font-black text-[11px] text-white uppercase tracking-widest block group-hover:text-primary transition-colors">{channel.label}</span>
                    <span className="text-[10px] text-zinc-600 font-medium leading-tight block mt-1">{channel.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col gap-4 mt-auto">
             <button className="w-full bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-400 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95">
              Descartar Cambios
            </button>
            <button className="w-full bg-primary-container hover:bg-[#6D28D9] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-[0_0_40px_rgba(124,58,237,0.3)] active:scale-95 flex items-center justify-center gap-3">
              <span className="material-symbols-outlined text-lg">save</span>
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
