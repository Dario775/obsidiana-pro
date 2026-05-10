import React from 'react';
import Link from 'next/link';

export function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-zinc-950/95 border-t border-white/10 shadow-[0_-4px_10px_rgba(0,0,0,0.5)] rounded-t-xl">
      <Link href="/pos" className="flex flex-col items-center justify-center text-violet-500 scale-110 active:bg-violet-500/20 p-2 rounded-lg transition-all">
        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>calculate</span>
        <span className="font-inter text-[10px] uppercase font-bold mt-1">POS</span>
      </Link>
      <Link href="/inventory" className="flex flex-col items-center justify-center text-zinc-500 active:bg-violet-500/20 p-2 rounded-lg transition-all">
        <span className="material-symbols-outlined text-[24px]">grid_view</span>
        <span className="font-inter text-[10px] uppercase font-bold mt-1">Stock</span>
      </Link>
      <Link href="/" className="flex flex-col items-center justify-center text-zinc-500 active:bg-violet-500/20 p-2 rounded-lg transition-all">
        <span className="material-symbols-outlined text-[24px]">search</span>
        <span className="font-inter text-[10px] uppercase font-bold mt-1">Search</span>
      </Link>
      <Link href="/menu" className="flex flex-col items-center justify-center text-zinc-500 active:bg-violet-500/20 p-2 rounded-lg transition-all">
        <span className="material-symbols-outlined text-[24px]">menu</span>
        <span className="font-inter text-[10px] uppercase font-bold mt-1">Menu</span>
      </Link>
    </nav>
  );
}
