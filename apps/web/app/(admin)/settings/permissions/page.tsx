import React from 'react';

export default function PermissionsPage() {
  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -ml-32 -mt-32 pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
        
        <div className="relative z-10 flex flex-col gap-4">
           <div className="flex items-center gap-2 text-zinc-600 font-black text-[9px] uppercase tracking-[0.2em]">
            <span className="hover:text-primary transition-colors cursor-pointer">Configuración</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Roles</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-white">Cajero</span>
          </div>
          <h1 className="font-headline-xl text-3xl font-black text-white tracking-tight">Permisos de Cajero</h1>
          <p className="text-zinc-500 font-body-sm text-sm max-w-2xl">Define los accesos operativos y transaccionales para el personal de línea de caja. Los cambios se sincronizan en tiempo real.</p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button className="px-6 py-3 rounded-xl border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 active:scale-95">
            <span className="material-symbols-outlined text-[18px]">undo</span>
            Restablecer
          </button>
          <button className="px-6 py-3 rounded-xl bg-primary-container text-white hover:bg-[#6D28D9] transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(124,58,237,0.3)] flex items-center gap-2 active:scale-95 group">
            <span className="material-symbols-outlined text-[18px] group-hover:scale-110 transition-transform">save</span>
            Guardar Cambios
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Main Permissions Panel */}
        <div className="xl:col-span-8 flex flex-col gap-8">
          {[
            {
              title: 'Ventas y Facturación',
              icon: 'receipt_long',
              items: [
                { label: 'Emitir Factura A/B/C', desc: 'Generación de comprobantes fiscales electrónicos AFIP.', checked: true },
                { label: 'Anular Ticket Fiscal', desc: 'Requiere autorización o credencial de supervisor.', checked: false },
                { label: 'Realizar Descuentos > 10%', desc: 'Habilitar descuentos manuales en subtotal.', checked: false },
              ]
            },
            {
              title: 'Operaciones de Caja',
              icon: 'point_of_sale',
              items: [
                { label: 'Apertura y Arqueo Inicial', desc: 'Declarar fondo de caja al inicio del turno.', checked: true },
                { label: 'Abrir Cajón Monedero', desc: 'Apertura física sin registrar venta (log auditoría).', checked: false },
                { label: 'Ejecutar Cierre Z', desc: 'Cierre fiscal diario en controlador fiscal.', checked: true },
              ]
            }
          ].map((section, i) => (
            <div key={i} className="bg-[#1A1A1A] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 bg-[#1E1E1E]/50 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined">{section.icon}</span>
                </div>
                <h3 className="font-black text-sm text-white uppercase tracking-widest">{section.title}</h3>
              </div>
              <div className="divide-y divide-white/5">
                {section.items.map((item, j) => (
                  <div key={j} className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex-1 pr-8">
                      <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">{item.label}</h4>
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">{item.desc}</p>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={item.checked} className="sr-only peer" />
                      <div className="w-12 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Info & Risk Panel */}
        <div className="xl:col-span-4 flex flex-col gap-8">
          {/* Role Summary Card */}
          <div className="bg-[#1A1A1A] rounded-3xl p-8 border border-white/10 flex flex-col gap-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-primary/10 transition-all duration-700"></div>
            <div className="flex items-center justify-between relative z-10">
              <h3 className="font-black text-xs text-white uppercase tracking-[0.2em]">Resumen del Rol</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-[8px] uppercase tracking-widest">Activo</span>
            </div>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                <span className="block text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Nivel</span>
                <span className="block text-white font-data-tabular text-xs font-bold">Operativo L1</span>
              </div>
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                <span className="block text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Asignados</span>
                <span className="block text-white font-data-tabular text-xs font-bold">12 Cajeros</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4 border-t border-white/5 relative z-10">
              <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-1">Usuarios Recientes</span>
              {[
                { name: 'Martín Gómez', loc: 'Belgrano', initial: 'MG' },
                { name: 'Lucía Rodríguez', loc: 'Centro', initial: 'LR' },
              ].map((u, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center font-black text-[10px] text-zinc-500">{u.initial}</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white leading-none">{u.name}</span>
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mt-1">Suc. {u.loc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Warning */}
          <div className="bg-red-500/5 rounded-3xl p-8 border border-red-500/20 relative overflow-hidden group">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0 border border-red-500/20">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              </div>
              <div>
                <h4 className="font-black text-xs text-red-400 uppercase tracking-widest mb-2">Advertencia de Seguridad</h4>
                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">Otorgar permisos de anulación requiere validación obligatoria según normativas fiscales. Se generarán logs de auditoría detallados.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
