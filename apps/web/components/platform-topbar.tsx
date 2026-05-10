import React from 'react';

export function Topbar() {
  return (
    <header className="fixed top-0 left-0 w-full z-40 h-16 bg-zinc-950/90 backdrop-blur-md border-b border-white/10 lg:ml-64 lg:w-[calc(100%-16rem)] flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <span className="lg:hidden text-lg font-black text-white uppercase tracking-tighter">Obsidiana</span>
        <div className="hidden md:flex items-center gap-4 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">All Systems Operational</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[18px]">search</span>
          <input 
            className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-primary-container w-64 transition-all" 
            placeholder="Search across all tenants..." 
            type="text" 
          />
        </div>
        <button className="p-2 text-zinc-400 hover:text-white transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="p-2 text-zinc-400 hover:text-white transition-colors">
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </header>
  );
}
