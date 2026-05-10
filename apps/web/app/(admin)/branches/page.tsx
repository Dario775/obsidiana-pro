import React from 'react';

export default function BranchesPage() {
  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
        
        <div>
          <h1 className="font-headline-xl text-3xl font-black text-white tracking-tight">Gestión de Sucursales</h1>
          <p className="text-zinc-500 font-body-sm text-sm mt-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">map</span>
            Administra las ubicaciones físicas y puntos de venta fiscales.
          </p>
        </div>
        
        <button className="flex items-center justify-center gap-3 px-6 py-3 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-95 group">
          <span className="material-symbols-outlined text-[18px] group-hover:rotate-90 transition-transform">add</span>
          Nueva Sucursal
        </button>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
        {[
          { 
            name: 'Casa Central - AR', 
            status: 'Activa', 
            address: 'Av. Corrientes 1234, CABA', 
            type: 'Física + E-commerce', 
            tax: 'Resp. Inscripto', 
            cuit: '30-71234567-8',
            terminals: [
              { id: '#01', type: 'Terminal POS', status: 'online' },
              { id: '#04', type: 'Facturación Online', status: 'online' }
            ],
            main: true
          },
          { 
            name: 'Sucursal Norte', 
            status: 'Activa', 
            address: 'Av. Cabildo 2500, CABA', 
            type: 'Física Exclusiva', 
            tax: 'Resp. Inscripto', 
            cuit: '30-71234567-8',
            terminals: [
              { id: '#02', type: 'Terminal POS Principal', status: 'online' }
            ]
          },
          { 
            name: 'Pop-up Dot Baires', 
            status: 'Inactiva', 
            address: 'Vedia 3600, CABA', 
            type: 'Stand Temporal', 
            tax: 'Resp. Inscripto', 
            cuit: '30-71234567-8',
            terminals: [],
            inactive: true
          }
        ].map((branch, i) => (
          <div key={i} className={`bg-[#1A1A1A] rounded-3xl border ${branch.main ? 'border-primary-container/30' : 'border-white/10'} p-8 flex flex-col gap-6 relative overflow-hidden group hover:border-white/20 transition-all ${branch.inactive ? 'opacity-60' : ''}`}>
            {branch.main && <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-container"></div>}
            
            <div className="flex justify-between items-start relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-black text-white tracking-tight">{branch.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full ${branch.inactive ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'} font-black text-[8px] uppercase tracking-widest border flex items-center gap-1.5`}>
                    <div className={`w-1 h-1 rounded-full ${branch.inactive ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`}></div>
                    {branch.status}
                  </span>
                </div>
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {branch.address}
                </p>
              </div>
              <button className="text-zinc-700 hover:text-white transition-colors">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                <span className="block text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1">Tipo</span>
                <span className="block text-white font-bold text-xs">{branch.type}</span>
              </div>
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                <span className="block text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1">Fiscal</span>
                <span className="block text-white font-bold text-xs">{branch.tax}</span>
                <span className="block text-[9px] font-black text-zinc-600 uppercase mt-0.5">{branch.cuit}</span>
              </div>
            </div>

            <div className="border-t border-white/5 pt-6 relative z-10">
               <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Puntos de Venta (PV)</h4>
                  <span className="bg-zinc-900 px-2 py-0.5 rounded-lg border border-white/5 text-white font-black text-[8px] uppercase tracking-widest">{branch.terminals.length} Terminales</span>
               </div>
               
               <div className="space-y-3 mb-6">
                {branch.terminals.length > 0 ? (
                  branch.terminals.map((pv, j) => (
                    <div key={j} className="flex items-center justify-between bg-zinc-950/50 rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all group/pv">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-600 group-hover/pv:text-primary-container transition-colors">
                          <span className="material-symbols-outlined text-lg">{pv.type.includes('Online') ? 'language' : 'point_of_sale'}</span>
                        </div>
                        <div>
                          <p className="font-black text-[11px] text-white uppercase tracking-widest">PV {pv.id}</p>
                          <p className="text-[9px] font-bold text-zinc-600 tracking-tight">{pv.type}</p>
                        </div>
                      </div>
                      <span className="text-emerald-500 material-symbols-outlined text-lg">check_circle</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center bg-zinc-950/30 rounded-2xl p-8 border border-white/5 border-dashed">
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest text-center">Sin puntos de venta activos</p>
                  </div>
                )}
               </div>

               <div className="flex gap-3">
                  <button className="flex-1 bg-zinc-900 border border-white/10 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all font-black text-[9px] uppercase tracking-widest py-3 rounded-xl">
                    Editar Datos
                  </button>
                  <button className={`flex-1 bg-zinc-900 border border-white/10 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all font-black text-[9px] uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 ${branch.inactive ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <span className="material-symbols-outlined text-lg">add</span> PV
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
