import React from 'react';

export function Topbar() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-zinc-950/90 backdrop-blur-md border-b border-white/10 md:hidden">
      <div className="flex items-center gap-4">
        <span className="text-xl font-black tracking-tighter text-white uppercase">Obsidiana</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-zinc-400 hover:text-white transition-colors hover:bg-white/5 p-2 rounded-full active:scale-95 transition-all flex items-center justify-center">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="text-zinc-400 hover:text-white transition-colors hover:bg-white/5 p-2 rounded-full active:scale-95 transition-all flex items-center justify-center">
          <span className="material-symbols-outlined">settings</span>
        </button>
        <button className="text-zinc-400 hover:text-white transition-colors hover:bg-white/5 p-2 rounded-full active:scale-95 transition-all flex items-center justify-center">
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </div>
    </header>
  );
}
