import React from 'react';

export default function BranchesPage() {
  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-zinc-400 font-label-md text-xs mb-2 uppercase tracking-widest">
            <span className="text-primary-container font-black">Ajustes</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Gestión de Sucursales</span>
          </div>
          <h1 className="font-headline-xl text-3xl font-black text-white mb-1">Puntos de Venta y Locales</h1>
          <p className="text-zinc-400 font-body-sm text-sm max-w-2xl">Administra las ubicaciones físicas de tu comercio y sus puntos de venta fiscales vinculados a la ARCA (ex-AFIP).</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button className="px-4 py-2 rounded-lg bg-primary-container hover:bg-[#6D28D9] text-white transition-all font-label-md text-xs uppercase font-bold tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(124,58,237,0.3)] active:scale-95">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nueva Sucursal
          </button>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
        {[
          { 
            name: 'Casa Central - AR', 
            status: 'Activa', 
            address: 'Av. Corrientes 1234, CABA', 
            type: 'Física + E-commerce', 
            fiscal: 'Resp. Inscripto', 
            cuit: '30-71234567-8',
            pvs: [
              { id: 'PV #01', type: 'Terminal POS', status: 'online' },
              { id: 'PV #04', type: 'Facturación Online', status: 'online' }
            ],
            color: 'emerald'
          },
          { 
            name: 'Sucursal Norte', 
            status: 'Activa', 
            address: 'Av. Cabildo 2500, CABA', 
            type: 'Física Exclusiva', 
            fiscal: 'Resp. Inscripto', 
            cuit: '30-71234567-8',
            pvs: [
              { id: 'PV #02', type: 'Terminal POS Principal', status: 'online' }
            ],
            color: 'emerald'
          },
          { 
            name: 'Pop-up Dot Baires', 
            status: 'Inactiva', 
            address: 'Vedia 3600, CABA', 
            type: 'Stand Temporal', 
            fiscal: 'Resp. Inscripto', 
            cuit: '30-71234567-8',
            pvs: [],
            color: 'red'
          }
        ].map((branch, i) => (
          <div key={i} className={`bg-[#1A1A1A] rounded-2xl border border-white/10 p-6 flex flex-col relative overflow-hidden group hover:border-primary/30 transition-all ${branch.status === 'Inactiva' ? 'opacity-60' : ''}`}>
            {branch.status === 'Activa' && <div className="absolute top-0 left-0 w-1 h-full bg-primary-container"></div>}
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-black text-white tracking-tight">{branch.name}</h3>
                  <span className={`bg-${branch.color === 'emerald' ? 'emerald' : 'red'}-500/10 text-${branch.color === 'emerald' ? 'emerald' : 'red'}-400 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1.5 border border-${branch.color === 'emerald' ? 'emerald' : 'red'}-500/20 font-black uppercase tracking-widest`}>
                    <span className={`w-1.5 h-1.5 rounded-full bg-${branch.color === 'emerald' ? 'emerald' : 'red'}-400 ${branch.status === 'Activa' ? 'animate-pulse' : ''}`}></span>
                    {branch.status}
                  </span>
                </div>
                <p className="text-zinc-500 font-bold text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                  {branch.address}
                </p>
              </div>
              <button className="p-2 text-zinc-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>

            <div className="flex gap-4 mb-8">
              <div className="bg-zinc-900 rounded-xl p-4 flex-1 border border-white/5">
                <p className="font-black text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Configuración</p>
                <p className="font-bold text-xs text-white">{branch.type}</p>
              </div>
              <div className="bg-zinc-900 rounded-xl p-4 flex-1 border border-white/5">
                <p className="font-black text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Situación Fiscal</p>
                <p className="font-bold text-xs text-white">{branch.fiscal}</p>
                <p className="text-[10px] text-zinc-600 font-medium mt-1">{branch.cuit}</p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-6 mt-auto">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-black text-[10px] text-zinc-400 uppercase tracking-[0.2em]">Puntos de Venta (PV)</h4>
                <span className="bg-zinc-800 text-zinc-400 font-data-tabular text-[10px] px-2 py-0.5 rounded-md font-black">{branch.pvs.length} Terminales</span>
              </div>
              
              <div className="space-y-3 mb-6">
                {branch.pvs.length > 0 ? branch.pvs.map((pv, j) => (
                  <div key={j} className="flex items-center justify-between bg-zinc-900/50 rounded-xl p-3 border border-white/5 group/pv hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover/pv:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px]">{pv.id.includes('Online') ? 'language' : 'point_of_sale'}</span>
                      </div>
                      <div>
                        <p className="font-data-tabular text-sm font-black text-white">{pv.id}</p>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">{pv.type}</p>
                      </div>
                    </div>
                    <span className="text-emerald-400 material-symbols-outlined text-[20px]">check_circle</span>
                  </div>
                )) : (
                  <div className="flex items-center justify-center bg-zinc-900/30 rounded-xl p-8 border border-dashed border-white/10">
                    <p className="text-[11px] text-zinc-600 font-bold uppercase text-center tracking-widest leading-relaxed">Sin puntos de venta<br/>activos vinculados</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button className={`flex-1 flex items-center justify-center gap-2 bg-transparent border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 font-black text-[10px] py-3 rounded-xl transition-all uppercase tracking-widest ${branch.status === 'Inactiva' ? 'cursor-not-allowed opacity-50' : ''}`}>
                  {branch.status === 'Inactiva' ? 'Reactivar' : 'Configurar'}
                </button>
                <button 
                  className={`flex-1 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 font-black text-[10px] py-3 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${branch.status === 'Inactiva' ? 'cursor-not-allowed opacity-50' : ''}`}
                  disabled={branch.status === 'Inactiva'}
                >
                  <span className="material-symbols-outlined text-[18px]">add</span> PV
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
