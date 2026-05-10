import React from 'react';

export default function CriticalStockPage() {
  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none group-hover:bg-red-500/10 transition-all duration-1000"></div>
        
        <div className="flex items-center gap-6">
          <div>
            <h1 className="font-headline-xl text-3xl font-black text-white tracking-tight">Stock Crítico</h1>
            <p className="text-zinc-500 font-body-sm text-sm mt-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-red-500 animate-pulse">error</span>
              Productos bajo el umbral de reposición — Acción inmediata requerida.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
          <button className="px-6 py-3 rounded-xl border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filtros
          </button>
          <button className="px-6 py-3 rounded-xl bg-primary-container text-white hover:bg-[#6D28D9] transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(124,58,237,0.3)] flex items-center gap-2 active:scale-95 group">
            <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">shopping_cart_checkout</span>
            Generar Orden de Compra
          </button>
        </div>
      </div>

      {/* Critical Items Table */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-900/50 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 border-b border-white/5">
                <th className="py-5 px-8 w-12"><input type="checkbox" className="rounded border-white/10 bg-transparent text-primary-container focus:ring-primary-container" /></th>
                <th className="py-5 px-8">Producto / SKU</th>
                <th className="py-5 px-8">Categoría</th>
                <th className="py-5 px-8 text-right">Stock Actual</th>
                <th className="py-5 px-8 text-right">Pto. Pedido</th>
                <th className="py-5 px-8 text-center">Estado</th>
                <th className="py-5 px-8 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm font-data-tabular text-white">
              {[
                { name: 'Auriculares Pro X', sku: 'AUD-PROX-01', cat: 'Audio', stock: 0, limit: 15, status: 'Agotado', color: 'red' },
                { name: 'Smartwatch Titan M2', sku: 'SWT-TM2-BK', cat: 'Wearables', stock: 3, limit: 10, status: 'Bajo', color: 'amber' },
                { name: 'Hub USB-C 8-en-1', sku: 'ACC-HUB-81', cat: 'Accesorios', stock: 0, limit: 25, status: 'Agotado', color: 'red' },
                { name: 'Powerbank 20k UR', sku: 'PWR-20K-UR', cat: 'Energía', stock: 5, limit: 30, status: 'Bajo', color: 'amber' },
              ].map((item, i) => (
                <tr key={i} className={`hover:bg-white/[0.02] transition-colors group ${item.stock === 0 ? 'bg-red-500/[0.02]' : ''}`}>
                  <td className="py-5 px-8"><input type="checkbox" className="rounded border-white/10 bg-transparent text-primary-container focus:ring-primary-container" /></td>
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
                  <td className={`py-5 px-8 text-right font-black ${item.stock === 0 ? 'text-red-500' : 'text-amber-500'}`}>{item.stock}</td>
                  <td className="py-5 px-8 text-right text-zinc-600 font-bold">{item.limit}</td>
                  <td className="py-5 px-8 text-center">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-${item.color}-500/10 text-${item.color}-400 border-${item.color}-500/20`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <button className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-700 hover:text-white hover:bg-zinc-700 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                      <span className="material-symbols-outlined text-lg">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-8 border-t border-white/5 bg-[#1E1E1E]/30 flex justify-between items-center">
          <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Mostrando 4 resultados con stock crítico</span>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 flex items-center justify-center border border-white/5 rounded-xl text-zinc-700 hover:text-white hover:bg-white/5 transition-all">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-4">Página 1 de 1</span>
            <button className="w-10 h-10 flex items-center justify-center border border-white/5 rounded-xl text-zinc-700 hover:text-white hover:bg-white/5 transition-all">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
