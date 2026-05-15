'use client';

import React from 'react';

export default function InfrastructurePage() {
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Infraestructura & Servidores</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Estado de los recursos y base de datos del SaaS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900 border border-white/5 rounded-xl p-6 shadow-2xl flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Rendimiento en Tiempo Real</h3>
            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Operacional
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Uso de CPU</p>
                <h4 className="text-2xl font-black text-white tracking-tighter">14.2%</h4>
              </div>
              <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-3">
                <div className="bg-violet-500 h-full w-[14%]"></div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Uso de Memoria</p>
                <h4 className="text-2xl font-black text-white tracking-tighter">32.8%</h4>
              </div>
              <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mt-3">
                <div className="bg-emerald-500 h-full w-[32%]"></div>
              </div>
            </div>
          </div>

          <div className="border border-white/5 rounded-xl p-4 bg-white/5 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tamaño del Pool de Datos</p>
              <span className="text-xs font-bold text-white">24 / 100</span>
            </div>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-[24%]"></div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-xl p-6 shadow-2xl flex flex-col gap-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-white">Salud del Sistema</h3>
          <div className="space-y-6">
            {[
              { label: 'Database (Supabase)', status: 'Operacional', uptime: '99.99%', color: 'emerald' },
              { label: 'Edge Network (Vercel)', status: 'Operacional', uptime: '100%', color: 'emerald' },
              { label: 'MercadoPago Webhooks', status: 'Operacional', uptime: '99.8%', color: 'emerald' },
              { label: 'ARCA Bridge API', status: 'Activo', uptime: '100%', color: 'emerald' }
            ].map((s, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-zinc-400">{s.label}</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest text-${s.color}-400`}>{s.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full bg-${s.color}-500 w-full`}></div>
                  </div>
                  <span className="text-[9px] font-black text-zinc-500">{s.uptime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
