import React from 'react';

export default function FiscalBillingPage() {
  return (
    <div className="max-w-[1000px] mx-auto bg-[#1A1A1A] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[700px] my-8">
      {/* Left: Form Area */}
      <div className="flex-1 p-8 md:p-12 flex flex-col border-b md:border-b-0 md:border-r border-white/5">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="font-headline-xl text-3xl font-black text-white tracking-tight">Facturación Electrónica</h1>
            <p className="text-zinc-500 font-body-sm mt-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">account_balance</span>
              Conexión directa con servidores de ARCA (ex-AFIP)
            </p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">ARCA Online</span>
          </div>
        </div>

        {/* Invoice Type Selection */}
        <div className="mb-12">
          <label className="block font-black text-[10px] text-zinc-600 uppercase tracking-[0.2em] mb-4">Tipo de Comprobante</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { type: 'A', label: 'Resp. Inscripto', active: true },
              { type: 'B', label: 'Cons. Final', active: false },
              { type: 'C', label: 'Monotributo', active: false },
            ].map((item, i) => (
              <button 
                key={i} 
                className={`rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all border-2 ${item.active ? 'bg-primary/5 border-primary shadow-[0_0_20px_rgba(124,58,237,0.1)]' : 'bg-zinc-900/50 border-white/5 hover:border-white/10 opacity-60 hover:opacity-100'}`}
              >
                <span className={`text-2xl font-black ${item.active ? 'text-primary' : 'text-zinc-600'}`}>{item.type}</span>
                <span className={`font-black text-[9px] uppercase tracking-widest ${item.active ? 'text-white' : 'text-zinc-500'}`}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Customer Search/Data */}
        <div className="mb-12 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h2 className="font-black text-[10px] text-zinc-600 uppercase tracking-[0.2em]">Datos del Receptor</h2>
            <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline transition-all">Limpiar</button>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors">id_card</span>
              <input 
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3.5 pl-12 pr-6 text-white font-data-tabular focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-700" 
                placeholder="CUIT / CUIL / DNI" 
                defaultValue="30-71234567-8"
                type="text" 
              />
            </div>
            <button className="bg-zinc-900 border border-white/10 rounded-xl px-5 flex items-center justify-center hover:bg-zinc-800 transition-all text-white group">
              <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">search</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block font-black text-[9px] text-zinc-600 uppercase tracking-widest ml-1">Razón Social / Nombre</label>
              <input className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-3 px-4 text-white font-bold text-xs focus:outline-none opacity-80" readOnly type="text" defaultValue="TECH SOLUTIONS SRL" />
            </div>
            <div className="space-y-2">
              <label className="block font-black text-[9px] text-zinc-600 uppercase tracking-widest ml-1">Condición Frente al IVA</label>
              <div className="relative">
                <select className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-white font-bold text-xs focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer">
                  <option>IVA Responsable Inscripto</option>
                  <option>IVA Exento</option>
                  <option>Consumidor Final</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">arrow_drop_down</span>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="space-y-6 mt-auto">
          <h2 className="font-black text-[10px] text-zinc-600 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Parámetros de Emisión</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block font-black text-[9px] text-zinc-600 uppercase tracking-widest ml-1">Punto de Venta</label>
              <div className="relative">
                <select className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-white font-data-tabular font-bold text-xs focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer">
                  <option>0004 - Local Central</option>
                  <option>0005 - Local Norte</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">arrow_drop_down</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block font-black text-[9px] text-zinc-600 uppercase tracking-widest ml-1">Concepto</label>
              <div className="relative">
                <select className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-white font-bold text-xs focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer">
                  <option>Productos</option>
                  <option>Servicios</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">arrow_drop_down</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Summary & Actions */}
      <div className="w-full md:w-[400px] bg-[#1E1E1E] flex flex-col p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        
        <div className="flex-1 relative z-10">
          <h3 className="font-black text-[10px] text-zinc-500 uppercase tracking-[0.2em] mb-8">Resumen Fiscal</h3>
          <div className="space-y-5 font-data-tabular">
            <div className="flex justify-between items-center text-sm font-bold text-zinc-400">
              <span>Subtotal Neto</span>
              <span className="text-white">$ 125.000,00</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-zinc-400">
              <span>IVA (21%)</span>
              <span className="text-white">$ 26.250,00</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-zinc-400">
              <span>Percepciones</span>
              <span className="text-zinc-600">$ 0,00</span>
            </div>
            <div className="h-px bg-white/5 my-8"></div>
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Total Comprobante</span>
              <span className="text-4xl font-black text-white tracking-tighter">$ 151.250,00</span>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-1">Pesos Argentinos</span>
            </div>
          </div>

          {/* ARCA Mock Status */}
          <div className="mt-12 bg-zinc-950/50 border border-white/5 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-600 border border-white/5">
                <span className="material-symbols-outlined">receipt_long</span>
              </div>
              <div>
                <p className="font-black text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Status AFIP</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <span className="text-zinc-600">CAE:</span>
                    <span className="text-zinc-700 italic">Pendiente emisión</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <span className="text-zinc-600">Vto:</span>
                    <span className="text-zinc-700 italic">--/--/----</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4 mt-12 relative z-10">
          <button className="w-full bg-primary-container hover:bg-[#6D28D9] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(124,58,237,0.3)] active:scale-95 group">
            <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">send</span>
            Autorizar y Cobrar
          </button>
          <button className="w-full bg-transparent border border-white/10 hover:border-white/20 text-zinc-500 hover:text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all">
            Solo Cobrar (Sin Fiscal)
          </button>
          <button className="w-full text-zinc-700 hover:text-red-500 font-black text-[9px] uppercase tracking-widest transition-all py-2">
            Descartar Operación
          </button>
        </div>
      </div>
    </div>
  );
}
