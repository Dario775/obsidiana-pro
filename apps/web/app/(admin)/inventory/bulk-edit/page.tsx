import React from 'react';

export default function BulkEditInventoryPage() {
  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -ml-32 -mt-32 pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
        
        <div>
          <h1 className="font-headline-xl text-3xl font-black text-white tracking-tight">Edición Masiva</h1>
          <p className="text-zinc-500 font-body-sm text-sm mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-primary-container bg-primary-container/10 px-2 py-0.5 rounded font-black text-[9px] uppercase border border-primary-container/20">
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              Modo Edición
            </span>
            <span>32 artículos seleccionados para actualización rápida</span>
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button className="px-6 py-3 rounded-xl border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filtros
          </button>
        </div>
      </div>

      {/* Bulk Edit Table */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-900/50 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 border-b border-white/5">
                <th className="py-5 px-8 w-12 text-center"><input type="checkbox" defaultChecked className="rounded border-white/10 bg-transparent text-primary-container focus:ring-primary-container" /></th>
                <th className="py-5 px-8">Producto / SKU</th>
                <th className="py-5 px-8">Categoría</th>
                <th className="py-5 px-8 text-right">Costo</th>
                <th className="py-5 px-8 text-right">Precio Venta</th>
                <th className="py-5 px-8 w-48 text-right text-primary-container group">
                  <div className="flex items-center justify-end gap-2">
                    En Mano
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </div>
                </th>
                <th className="py-5 px-8 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm font-data-tabular text-white">
              {[
                { name: 'Smartwatch Obsidian X', sku: 'OBS-SM-X01', cat: 'Electrónica', cost: '$ 120.00', price: '$ 299.99', stock: 45, status: 'Normal', color: 'blue' },
                { name: 'Auriculares Pro', sku: 'OBS-AU-P02', cat: 'Audio', cost: '$ 45.50', price: '$ 129.00', stock: 12, status: 'Bajo Stock', color: 'amber' },
                { name: 'Funda Silicona Mate', sku: 'OBS-CS-14M', cat: 'Accesorios', cost: '$ 5.00', price: '$ 19.99', stock: 156, status: 'Normal', color: 'blue', disabled: true },
                { name: 'Teclado Mecánico K8', sku: 'OBS-KB-K8', cat: 'Periféricos', cost: '$ 65.00', price: '$ 149.50', stock: 0, status: 'Agotado', color: 'red' },
              ].map((item, i) => (
                <tr key={i} className={`hover:bg-white/[0.02] transition-colors group ${item.disabled ? 'opacity-40' : ''}`}>
                  <td className="py-5 px-8 text-center"><input type="checkbox" defaultChecked={!item.disabled} className="rounded border-white/10 bg-transparent text-primary-container focus:ring-primary-container" /></td>
                  <td className="py-5 px-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center font-black text-xs text-zinc-700">
                        IMG
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white group-hover:text-primary transition-colors">{item.name}</p>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-0.5">{item.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-8 text-zinc-400 font-bold text-xs">{item.cat}</td>
                  <td className="py-5 px-8 text-right text-zinc-500 font-bold">{item.cost}</td>
                  <td className="py-5 px-8 text-right font-black text-white">{item.price}</td>
                  <td className="py-5 px-8">
                    {!item.disabled ? (
                      <div className="relative group/input">
                        <input 
                          type="number" 
                          defaultValue={item.stock} 
                          className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-4 text-right font-black text-white focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all shadow-inner"
                        />
                      </div>
                    ) : (
                      <div className="text-right pr-4 text-zinc-600 font-black">{item.stock}</div>
                    )}
                  </td>
                  <td className="py-5 px-8 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-${item.color}-500/10 text-${item.color}-400 border-${item.color}-500/20`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 z-50">
        <div className="bg-[#1A1A1A]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-5 pl-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-container/20 flex items-center justify-center border border-primary-container/30">
              <span className="material-symbols-outlined text-primary-container">library_add_check</span>
            </div>
            <div>
              <p className="font-black text-xs text-white uppercase tracking-widest">32 elementos listos</p>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">3 cambios detectados</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 pr-2">
            <button className="px-6 py-4 rounded-2xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all font-black text-[10px] uppercase tracking-widest">
              Cancelar
            </button>
            <button className="px-8 py-4 rounded-2xl bg-primary-container text-white hover:bg-[#6D28D9] transition-all font-black text-xs uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(124,58,237,0.4)] flex items-center gap-3 group active:scale-95">
              <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">save</span>
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
