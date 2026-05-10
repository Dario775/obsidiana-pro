import React from 'react';

export default function InvoicePage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 md:p-8 relative">
      <div className="max-w-[1000px] mx-auto bg-surface-container rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Left: Form Area */}
        <div className="flex-1 p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r border-white/10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="font-headline-md text-white">Facturación ARCA</h1>
              <p className="text-zinc-400 font-body-sm mt-1">Configura y emite el comprobante electrónico.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1A1A] border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-emerald-400 font-label-md">ARCA Online</span>
            </div>
          </div>

          {/* Invoice Type */}
          <div className="mb-8">
            <label className="block font-label-md text-zinc-400 mb-3 uppercase tracking-wider">Tipo de Comprobante</label>
            <div className="grid grid-cols-3 gap-2">
              <button className="bg-surface-container-high border-2 border-primary-container rounded-lg p-3 flex flex-col items-center justify-center gap-1 transition-all">
                <span className="font-headline-md text-primary-container text-2xl font-bold">A</span>
                <span className="font-label-md text-zinc-300">Resp. Inscripto</span>
              </button>
              <button className="bg-surface-container-high border border-white/10 rounded-lg p-3 flex flex-col items-center justify-center gap-1 hover:bg-surface-container-highest transition-all opacity-70">
                <span className="font-headline-md text-zinc-400 text-2xl font-bold">B</span>
                <span className="font-label-md text-zinc-400">Cons. Final</span>
              </button>
              <button className="bg-surface-container-high border border-white/10 rounded-lg p-3 flex flex-col items-center justify-center gap-1 hover:bg-surface-container-highest transition-all opacity-70">
                <span className="font-headline-md text-zinc-400 text-2xl font-bold">C</span>
                <span className="font-label-md text-zinc-400">Monotributo</span>
              </button>
            </div>
          </div>

          {/* Customer Data */}
          <div className="mb-8 space-y-4">
            <h2 className="font-label-md text-zinc-400 uppercase tracking-wider border-b border-white/5 pb-2">Datos del Receptor</h2>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input 
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-md py-2.5 px-3 text-white font-data-tabular focus:outline-none focus:border-primary-container transition-colors" 
                  placeholder="CUIT / CUIL" 
                  type="text" 
                  defaultValue="30-71234567-8"
                />
              </div>
              <button className="bg-surface-container-high border border-white/10 rounded-md px-4 flex items-center justify-center hover:bg-white/5 transition-colors text-zinc-300">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-md text-zinc-500 mb-1">Razón Social</label>
                <input 
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-md py-2 px-3 text-white font-body-sm focus:outline-none focus:border-primary-container transition-colors" 
                  readOnly 
                  type="text" 
                  defaultValue="TECH SOLUTIONS SRL"
                />
              </div>
              <div>
                <label className="block font-label-md text-zinc-500 mb-1">Condición IVA</label>
                <select className="w-full bg-[#1A1A1A] border border-white/10 rounded-md py-2 px-3 text-white font-body-sm focus:outline-none focus:border-primary-container transition-colors appearance-none">
                  <option>IVA Responsable Inscripto</option>
                  <option>IVA Exento</option>
                  <option>Consumidor Final</option>
                </select>
              </div>
            </div>
          </div>

          {/* Billing Details */}
          <div className="space-y-4 mt-auto">
            <h2 className="font-label-md text-zinc-400 uppercase tracking-wider border-b border-white/5 pb-2">Detalles de Emisión</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-label-md text-zinc-500 mb-1">Punto de Venta</label>
                <select className="w-full bg-[#1A1A1A] border border-white/10 rounded-md py-2 px-3 text-white font-data-tabular focus:outline-none focus:border-primary-container transition-colors appearance-none">
                  <option>0004 - Local Central</option>
                </select>
              </div>
              <div>
                <label className="block font-label-md text-zinc-500 mb-1">Concepto</label>
                <select className="w-full bg-[#1A1A1A] border border-white/10 rounded-md py-2 px-3 text-white font-body-sm focus:outline-none focus:border-primary-container transition-colors appearance-none">
                  <option>Productos</option>
                  <option>Servicios</option>
                  <option>Productos y Servicios</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary & Actions */}
        <div className="w-full md:w-[350px] bg-[#1A1A1A] flex flex-col p-6 md:p-8 relative">
          <div className="flex-1">
            <h3 className="font-label-md text-zinc-500 uppercase tracking-wider mb-4">Resumen de Operación</h3>
            <div className="space-y-3 font-data-tabular text-sm">
              <div className="flex justify-between items-center text-zinc-300">
                <span>Subtotal</span>
                <span>$ 125.000,00</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span>IVA (21%)</span>
                <span>$ 26.250,00</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span>Percepciones</span>
                <span>$ 0,00</span>
              </div>
              <div className="h-px bg-white/10 my-4"></div>
              <div className="flex justify-between items-end">
                <span className="text-zinc-400 font-label-md uppercase">Total ARS</span>
                <span className="text-white font-headline-md tracking-tight text-2xl font-bold">$ 151.250,00</span>
              </div>
            </div>

            {/* Draft State Preview */}
            <div className="mt-8 bg-surface-container-low border border-white/5 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-zinc-500 mt-0.5">receipt_long</span>
                <div>
                  <p className="font-label-md text-zinc-400 mb-1">Vista Previa AFIP</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-data-tabular">
                      <span className="text-zinc-500">CAE:</span>
                      <span className="text-zinc-600 italic">Pendiente de emisión</span>
                    </div>
                    <div className="flex justify-between text-xs font-data-tabular">
                      <span className="text-zinc-500">Vto. CAE:</span>
                      <span className="text-zinc-600 italic">--/--/----</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 mt-8">
            <button className="w-full bg-primary-container text-white font-body-sm font-semibold rounded-md py-3 shadow-[0_0_15px_rgba(124,58,237,0.2)] hover:bg-primary-container/90 transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
              <span className="material-symbols-outlined text-[20px]">send</span>
              Emitir Factura y Cobrar
            </button>
            <button className="w-full bg-transparent border border-secondary text-secondary font-body-sm font-semibold rounded-md py-3 hover:bg-secondary/10 transition-colors uppercase tracking-wide">
              Solo Cobrar (Sin Factura)
            </button>
            <button className="w-full text-zinc-500 font-body-sm font-medium py-2 hover:text-white transition-colors uppercase text-xs tracking-widest">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
