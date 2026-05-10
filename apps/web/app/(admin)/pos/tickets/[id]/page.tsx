import React from 'react';

export default function FiscalTicketPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col pt-24 pb-32">
      {/* Top Header Actions */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-zinc-900/50 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-10 z-50">
        <button className="flex items-center gap-3 text-zinc-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest group">
          <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Volver
        </button>
        
        <div className="flex items-center gap-4">
          <button className="px-6 py-3 rounded-xl border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">download</span>
            Descargar PDF
          </button>
          <button className="px-6 py-3 rounded-xl bg-primary-container text-white hover:bg-[#6D28D9] transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(124,58,237,0.3)] flex items-center gap-2 active:scale-95">
            <span className="material-symbols-outlined text-lg">print</span>
            Reimprimir
          </button>
        </div>
      </div>

      {/* Ticket Container */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Visual Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[700px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative w-full max-w-[380px] group transition-all duration-700 hover:scale-[1.02]">
          {/* Thermal Paper Shadow */}
          <div className="absolute -inset-4 bg-black/40 blur-3xl rounded-[3rem] transition-opacity duration-700 opacity-50 group-hover:opacity-100"></div>

          {/* Ticket Body */}
          <div className="relative bg-white text-zinc-900 shadow-2xl overflow-hidden flex flex-col font-mono text-[11px] leading-relaxed">
            {/* Ragged Edges Top */}
            <div className="flex justify-around bg-zinc-950 h-2 w-full">
               {Array.from({ length: 40 }).map((_, i) => (
                 <div key={i} className="w-2 h-2 bg-white rounded-full -mt-1"></div>
               ))}
            </div>

            <div className="p-10 flex flex-col gap-8">
              {/* Header Store Info */}
              <div className="text-center flex flex-col gap-1.5">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-2xl font-bold">diamond</span>
                  <span className="text-2xl font-black tracking-tighter uppercase">Obsidiana</span>
                </div>
                <p className="font-black text-xs uppercase tracking-widest">Casa Central</p>
                <div className="flex flex-col gap-0.5 text-zinc-500 font-bold">
                  <p>Av. Corrientes 1234, Piso 5</p>
                  <p>C1043AAZ, CABA, Argentina</p>
                  <p>CUIT: 30-71234567-8</p>
                  <p>IVA Responsable Inscripto</p>
                </div>
              </div>

              <div className="border-t border-zinc-200 border-dashed"></div>

              {/* Document Info */}
              <div className="flex flex-col items-center gap-4">
                <div className="border-2 border-zinc-900 px-6 py-2 text-lg font-black tracking-[0.2em]">FACTURA B</div>
                <div className="w-full flex flex-col gap-1 text-zinc-500 font-bold">
                  <div className="flex justify-between">
                    <span>COMP. NRO:</span>
                    <span className="text-zinc-900">0001-00001234</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FECHA:</span>
                    <span className="text-zinc-900">15/10/2024 14:30</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-200 border-dashed"></div>

              {/* Items Table */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-between font-black border-b border-zinc-200 pb-2">
                  <span className="w-12">CANT</span>
                  <span className="flex-1 px-4">DESCRIPCIÓN</span>
                  <span className="w-20 text-right">TOTAL</span>
                </div>
                {[
                  { qty: '1.00', desc: 'Monitor Dell UltraSharp 27"', price: '$ 450.000,00' },
                  { qty: '2.00', desc: 'Teclado Mecánico K2', price: '$ 170.000,00' },
                  { qty: '1.00', desc: 'Mouse MX Master 3S', price: '$ 95.000,00' },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex justify-between font-bold">
                      <span className="w-12">{item.qty}</span>
                      <span className="flex-1 px-4 uppercase truncate">{item.desc}</span>
                      <span className="w-20 text-right">{item.price}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-zinc-900 pt-4 mt-2 flex flex-col gap-2">
                <div className="flex justify-between font-bold text-zinc-500">
                  <span>SUBTOTAL</span>
                  <span>$ 715.000,00</span>
                </div>
                <div className="flex justify-between font-black text-lg border-t border-zinc-900 pt-4 mt-2">
                  <span>TOTAL</span>
                  <span>$ 715.000,00</span>
                </div>
                <div className="flex justify-between text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-2">
                  <span>MEDIO DE PAGO:</span>
                  <span>Tarjeta Crédito (Visa)</span>
                </div>
              </div>

              <div className="border-t border-zinc-200 border-dashed"></div>

              {/* AFIP Footer */}
              <div className="flex flex-col items-center gap-6">
                 {/* QR Mock */}
                 <div className="w-32 h-32 bg-zinc-100 p-2 border border-zinc-200">
                    <div className="w-full h-full bg-zinc-900 grid grid-cols-8 grid-rows-8 gap-[1px] p-[1px]">
                       {Array.from({ length: 64 }).map((_, i) => (
                         <div key={i} className={`${Math.random() > 0.5 ? 'bg-white' : 'bg-zinc-900'}`}></div>
                       ))}
                    </div>
                 </div>

                 <div className="w-full flex flex-col gap-1 text-center font-bold text-zinc-500">
                    <p className="text-zinc-900 font-black mb-2 uppercase tracking-widest">Comprobante Autorizado</p>
                    <div className="flex justify-between px-4">
                      <span>CAE:</span>
                      <span className="text-zinc-900">74123456789012</span>
                    </div>
                    <div className="flex justify-between px-4">
                      <span>VTO CAE:</span>
                      <span className="text-zinc-900">24/10/2024</span>
                    </div>
                 </div>

                 <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-4">Gracias por su compra</p>
              </div>
            </div>

            {/* Ragged Edges Bottom */}
            <div className="flex justify-around bg-zinc-950 h-2 w-full mt-auto">
               {Array.from({ length: 40 }).map((_, i) => (
                 <div key={i} className="w-2 h-2 bg-white rounded-full mt-1"></div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
